import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { UserAccount, UserSession, UserRole } from '../types.ts';

const USERS_COLLECTION = 'users';
const SESSION_KEY = 'unipack_active_session';

const DEFAULT_ADMIN: UserAccount = {
  fullName: 'JHOEL TORREGROSA',
  user: 'JTORREGROSA',
  pass: '9927',
  role: 'Administrador',
  status: 'Activo',
  createdAt: '2025-01-01'
};

let cachedUsers: UserAccount[] = [DEFAULT_ADMIN];

export const AuthService = {
  // Real-time listener for users
  subscribeUsers: (callback: (users: UserAccount[]) => void): Unsubscribe => {
    const colRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Initialize default admin if collection is empty
          try {
            await setDoc(doc(db, USERS_COLLECTION, DEFAULT_ADMIN.user), DEFAULT_ADMIN);
          } catch (e) {
            console.error('Error seeding default admin in Firestore:', e);
          }
          cachedUsers = [DEFAULT_ADMIN];
          callback(cachedUsers);
          return;
        }

        const users: UserAccount[] = [];
        snapshot.forEach((docSnap) => {
          users.push(docSnap.data() as UserAccount);
        });

        // Ensure default admin always exists
        if (!users.some((u) => u.user.toUpperCase() === 'JTORREGROSA')) {
          try {
            setDoc(doc(db, USERS_COLLECTION, DEFAULT_ADMIN.user), DEFAULT_ADMIN);
          } catch {}
          users.unshift(DEFAULT_ADMIN);
        }

        cachedUsers = users;
        callback(users);
      },
      (error) => {
        console.error('Error listening to users collection in Firestore:', error);
        callback(cachedUsers);
      }
    );
  },

  getUsers: (): UserAccount[] => {
    return cachedUsers;
  },

  register: async (
    fullName: string,
    user: string,
    pass: string,
    role: UserRole
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const normalizedUser = user.trim().toUpperCase();
      if (cachedUsers.some((u) => u.user.toUpperCase() === normalizedUser)) {
        return { success: false, message: 'El usuario ya existe en el sistema.' };
      }

      const newUser: UserAccount = {
        fullName: fullName.trim().toUpperCase(),
        user: normalizedUser,
        pass,
        role,
        status: 'Activo',
        createdAt: new Date().toISOString().split('T')[0]
      };

      const docRef = doc(db, USERS_COLLECTION, normalizedUser);
      await setDoc(docRef, newUser);

      // Optimistic cache update
      cachedUsers = [...cachedUsers.filter((u) => u.user !== normalizedUser), newUser];

      return { success: true };
    } catch (error: any) {
      console.error('Error registering user in Firestore:', error);
      return { success: false, message: error?.message || 'Error al guardar usuario en Firestore.' };
    }
  },

  updateUser: async (userObj: UserAccount): Promise<void> => {
    try {
      const normalizedUser = userObj.user.trim().toUpperCase();
      const docRef = doc(db, USERS_COLLECTION, normalizedUser);
      await setDoc(docRef, userObj, { merge: true });

      cachedUsers = cachedUsers.map((u) => (u.user === normalizedUser ? userObj : u));
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      throw error;
    }
  },

  deleteUser: async (username: string): Promise<void> => {
    try {
      const normalizedUser = username.trim().toUpperCase();
      if (normalizedUser === 'JTORREGROSA') {
        throw new Error('La cuenta de Administrador principal no puede ser eliminada.');
      }
      const docRef = doc(db, USERS_COLLECTION, normalizedUser);
      await deleteDoc(docRef);

      cachedUsers = cachedUsers.filter((u) => u.user !== normalizedUser);
    } catch (error) {
      console.error('Error deleting user in Firestore:', error);
      throw error;
    }
  },

  login: async (
    user: string,
    pass: string
  ): Promise<{ success: boolean; message?: string; session?: UserSession }> => {
    try {
      const normalizedUser = user.trim().toUpperCase();
      let users = cachedUsers;

      // Fallback check against Firestore if cache is only default
      if (users.length <= 1) {
        try {
          const colRef = collection(db, USERS_COLLECTION);
          const snap = await getDocs(colRef);
          if (!snap.empty) {
            const fetched: UserAccount[] = [];
            snap.forEach((d) => fetched.push(d.data() as UserAccount));
            users = fetched;
            cachedUsers = fetched;
          }
        } catch {}
      }

      const found = users.find(
        (u) => u.user.toUpperCase() === normalizedUser && u.pass === pass
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

      // Allow default credentials fallback if network or first boot
      if (normalizedUser === DEFAULT_ADMIN.user && pass === DEFAULT_ADMIN.pass) {
        const session: UserSession = {
          fullName: DEFAULT_ADMIN.fullName,
          user: DEFAULT_ADMIN.user,
          role: DEFAULT_ADMIN.role,
          token: 'sess_' + Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, session };
      }

      return { success: false, message: 'Credenciales inválidas. Verifique usuario y contraseña.' };
    } catch (error: any) {
      return { success: false, message: 'Error de acceso a la base de datos: ' + (error?.message || '') };
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
