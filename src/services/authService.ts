import { UserAccount, UserSession, UserRole } from '../types.ts';

const USERS_KEY = 'unipack_users_db_v2';
const SESSION_KEY = 'unipack_active_session';

const DEFAULT_USERS: UserAccount[] = [
  {
    fullName: 'JHOEL TORREGROSA',
    user: 'JTORREGROSA',
    pass: '9927',
    role: 'Administrador',
    status: 'Activo',
    createdAt: new Date().toISOString().split('T')[0]
  }
];

export const AuthService = {
  getUsers: (): UserAccount[] => {
    try {
      const data = localStorage.getItem(USERS_KEY);
      if (!data) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      let users: UserAccount[] = JSON.parse(data);
      users = users.map((u) => {
        if (u.user === 'JTORREGROSA' && u.fullName !== 'JHOEL TORREGROSA') {
          u.fullName = 'JHOEL TORREGROSA';
        }
        return u;
      });
      return users;
    } catch {
      return DEFAULT_USERS;
    }
  },

  register: (
    fullName: string,
    user: string,
    pass: string,
    role: UserRole
  ): { success: boolean; message?: string } => {
    try {
      const users = AuthService.getUsers();
      if (users.some((u) => u.user.toUpperCase() === user.toUpperCase())) {
        return { success: false, message: 'El usuario ya existe en el sistema.' };
      }
      users.push({
        fullName: fullName.toUpperCase(),
        user: user.toUpperCase(),
        pass,
        role,
        status: 'Activo',
        createdAt: new Date().toISOString().split('T')[0]
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return { success: true };
    } catch {
      return { success: false, message: 'Error al guardar en el almacenamiento local del navegador.' };
    }
  },

  updateUser: (userObj: UserAccount): void => {
    try {
      const users = AuthService.getUsers();
      const index = users.findIndex((u) => u.user === userObj.user);
      if (index > -1) {
        users[index] = userObj;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    } catch {
      // Ignored
    }
  },

  deleteUser: (username: string): void => {
    try {
      let users = AuthService.getUsers();
      users = users.filter((u) => u.user !== username);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      // Ignored
    }
  },

  login: (user: string, pass: string): { success: boolean; message?: string; session?: UserSession } => {
    try {
      const users = AuthService.getUsers();
      const found = users.find(
        (u) => u.user.toUpperCase() === user.toUpperCase() && u.pass === pass
      );

      if (found) {
        if (found.status === 'Inactivo') {
          return { success: false, message: 'Su cuenta está inactiva. Contacte al administrador.' };
        }
        const session: UserSession = {
          fullName: found.fullName.toUpperCase(),
          user: found.user.toUpperCase(),
          role: found.role,
          token: 'sess_' + Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, session };
      }
      return { success: false, message: 'Credenciales inválidas. Verifique usuario y contraseña.' };
    } catch {
      return { success: false, message: 'Error de acceso. Verifique la configuración de almacenamiento de su navegador.' };
    }
  },

  getSession: (): UserSession | null => {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  logout: (): void => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignored
    }
  }
};
