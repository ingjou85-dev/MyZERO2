export const MASTER_DATA = {
  stations: [
    'Estación 452',
    'Estación 453',
    'Estación 454',
    'Estación 455',
    'Estación 4 oz',
    'Estación 6 oz'
  ],
  stationMachines: {
    'Estación 452': ['459', '4513', '4514', '4515', '4516'],
    'Estación 453': ['451', '456', '4517', '4518', '4519'],
    'Estación 454': ['452', '454', '4511', '4512', '4520'],
    'Estación 455': ['453', '455', '457', '458', '4510'],
    'Estación 4 oz': ['401', '402', '403', '404'],
    'Estación 6 oz': ['601', '602', '603'],
    // Compatibilidad con registros existentes:
    'Estación 451': ['459', '4513', '4514', '4515', '4516'],
    'Estación 51': ['459', '4513', '4514', '4515', '4516'],
    'Estación 53': ['451', '456', '4517', '4518', '4519'],
    'Estación 54': ['452', '454', '4511', '4512', '4520'],
    'Estación 55': ['453', '455', '457', '458', '4510']
  } as Record<string, string[]>,
  technicians: [
    'EDUARDO',
    'EMIL',
    'FABIO',
    'JAWY',
    'JHAN',
    'JOSE',
    'WEYDER',
    'BRIAN',
    'AUXILAR',
    'EDUARDO V.'
  ],
  auxiliaries: [
    'CARLOS',
    'JUAN',
    'JAIRO',
    'LUIS',
    'JEISON',
    'LUIS D.',
    'DUVÁN',
    'LEONARDO',
    'CARLOS M.',
    'PHINEAS'
  ],
  approvers: [
    'PHINEAS',
    'ALEXANDRA'
  ],
  defects: [
    'V1 - BORDE PICADO',
    'V2 - BORDE MALTRATADO',
    'V3 - BORDE AGRIETADO',
    'V4 - BORDE CON CIERRE DOBLADO (BORDE EN V)',
    'V5 - BORDE CON EMPALME DESALINEADO EXTERIOR (BORDE CACHON)',
    'V6 - VASO SIN BORDE (PELON)',
    'V7 - PUNTA PARTIDA (PUNTA REVENTADA)',
    'V8 - PUNTA MAL FORMADA (JOPO DE POLLO)',
    'V9 - PUNTA CON BANDERA',
    'V10 - BOTANDO HOJILLA',
    'V11 - MAL SELLADO (GOTEO)',
    'V12 - GANCHO',
    'V13 - MAQUINA ENREDADA',
    'V14 - ARRANQUE DE MAQUINA',
    'V15 - VASO APRETADO (EN MAGAZIN)',
    'V16 - VASO PEGADO',
    'V17 - VASO PERFORADO',
    'V18 - DAÑO ELECTRICO',
    'V19 - VASO DOBLE',
    'V20 - VASO ABIERTO',
    'V21 - VASO ARRUGADO',
    'V22 - VASO MACHUCADO',
    'V23 - BORDE GRUESO',
    'V24 - CAMBIO ROLLO',
    'V25 - BORDE CON EMPALME DESALINEADO INTERIOR (BORDE CACHON)'
  ],
  solutions: [
    'S1 - AJUSTE DE PRESION DEL MAGAZIN',
    'S2 - AJUSTE DE PRESION RODILLO ENCAUCHETADO',
    'S3 - CAMBIO DE BUJE DEL FLAPPER',
    'S4 - CAMBIO DE CARTONES',
    'S5 - CAMBIO DE CINTA',
    'S6 - CAMBIO DE CORREA',
    'S7 - CAMBIO DE CUCHILLA',
    'S8 - CAMBIO DE GATILLO',
    'S9 - CAMBIO DE RESORTE',
    'S10 - CAMBIO DE RODAMIENTO',
    'S11 - CAMBIO DE SEGUIDOR',
    'S12 - CAMBIO DEL LANCETA',
    'S13 - OTRAS SOLUCIONES (EXPLIQUE DETRAS DE LA HOJA)',
    'S14 - CAMBIO DEL RODILLO PISA CUCHILLA',
    'S15 - CUADRE AGUJA',
    'S16 - CUADRE CEPILLO',
    'S17 - CUADRE CUCHILLA',
    'S18 - CUADRE DE BRAZO Y CULATA',
    'S19 - CUADRE DE GOMA',
    'S20 - CUADRE DE PAPEL (VIRUTA, BANDERA, PORTAROLLO)',
    'S21 - CUADRE DE PRESION DE LOS CEPILLOS',
    'S22 - CUADRE DEL ALIMENTADOR',
    'S23 - CUADRE LAMINA DEL FLAPPER',
    'S24 - CUADRE LAPIZ',
    'S25 - CUADRE TIEMPO DE LANCETA Y FLAPPER',
    'S26 - LIMIPEZA DE CONO',
    'S27 - LIMPIEZA DE CUCHILLA',
    'S28 - LIMPIEZA DE RODILLO PISA CUCHILLA',
    'S29 - LIMPIEZA DE VALVULA',
    'S30 - LIMPIEZA DE COPA',
    'S31 - LUBRICAR CASQUILLO CON SILICONA (ACEITE FOOD)',
    'S32 - CUADRE DE ARO',
    'S33 - CUADRE DE CASQUILLO'
  ],
  shifts: [
    'Turno 1',
    'Turno 2'
  ],
  machines: [
    '451',
    '452',
    '453',
    '454',
    '455',
    '456',
    '457',
    '458',
    '459',
    '601',
    '602',
    '603',
    '401',
    '402',
    '403',
    '404',
    '4510',
    '4511',
    '4512',
    '4513',
    '4514',
    '4515',
    '4516',
    '4517',
    '4518',
    '4519',
    '4520'
  ],
  references: [
    'LANCA 4,5 OZ',
    'ECOTOUCH 4,5 OZ',
    'VICTORIA BAY 4,5 OZ',
    'PREMIUM 4,5 OZ',
    'YESPAC 4,5 OZ',
    'INDUSNIG 4,5 OZ',
    'ECUADOR 4,5 OZ',
    'ALEMANIA 4,5 OZ',
    'FUTURE 4,5 OZ',
    'UPAK 4,5 OZ',
    'EMPRESS 4,5 OZ',
    'INDUSMIDA 4,5 OZ',
    'SUPLISOL 4.5 OZ',
    'ALEMANIA 4 OZ',
    'LANCA 4 OZ',
    'CUP CONE 4 OZ',
    'ECOTOUCH 4 OZ',
    'ECUADOR EARTHWISE 4 OZ',
    'FINO 4 OZ',
    'ALEMANIA 6 OZ',
    'INGLATERRA 6 OZ',
    'PINILLAR 6 OZ',
    'OLIMPICA 6 OZ'
  ],
  standardWeights: {
    individualCup: [1.4, 1.7, 2.4],
    foldingBox: [29.5, 34, 47.7],
    finalBox: [89, 103, 129],
    bottom: [1.4, 1.7, 2.4],
    lid: [29.5, 34, 47.7],
    total: [89, 103, 129]
  },
  qualityTestOptions: [
    'Muestra 25 vasos - Hermético sin fugas',
    'Muestra 50 vasos - 100% Hermético',
    'Muestra 100 vasos - Sin goteo ni filtración',
    'Muestra 20 vasos - Rasgado y sellado conforme',
    'Prueba especial de llenado caliente'
  ],
  getStationForMachine: (machineNum: string): string => {
    if (['459', '4513', '4514', '4515', '4516'].includes(machineNum)) return 'Estación 452';
    if (['451', '456', '4517', '4518', '4519'].includes(machineNum)) return 'Estación 453';
    if (['452', '454', '4511', '4512', '4520'].includes(machineNum)) return 'Estación 454';
    if (['453', '455', '457', '458', '4510'].includes(machineNum)) return 'Estación 455';
    if (['401', '402', '403', '404'].includes(machineNum)) return 'Estación 4 oz';
    if (['601', '602', '603'].includes(machineNum)) return 'Estación 6 oz';
    for (const [station, machines] of Object.entries(MASTER_DATA.stationMachines)) {
      if (machines.includes(machineNum)) return station;
    }
    return '';
  },
  getMachinesForStation: (stationName?: string): string[] => {
    if (!stationName) return MASTER_DATA.machines;
    return MASTER_DATA.stationMachines[stationName] || MASTER_DATA.machines;
  },
  getReferencesForStation: (stationName?: string): string[] => {
    if (!stationName) return [];
    const st = stationName.toLowerCase();
    // Estaciones 452, 453, 454 y 455 (y aliases 51, 53, 54, 55, 451): Carga exclusivamente las referencias de 4.5 oz
    if (
      st.includes('452') ||
      st.includes('453') ||
      st.includes('454') ||
      st.includes('455') ||
      st.includes('451') ||
      st.includes('51') ||
      st.includes('53') ||
      st.includes('54') ||
      st.includes('55')
    ) {
      return MASTER_DATA.references.filter((r) => r.includes('4,5') || r.includes('4.5'));
    }
    // Estación 4 oz: Carga exclusivamente las referencias de 4 oz
    if (st.includes('4 oz') || st.includes('4oz')) {
      return MASTER_DATA.references.filter(
        (r) =>
          (r.includes('4 OZ') || r.includes('4OZ') || r.includes('4 oz')) &&
          !r.includes('4,5') &&
          !r.includes('4.5')
      );
    }
    // Estación 6 oz: Carga exclusivamente las referencias de 6 oz
    if (st.includes('6 oz') || st.includes('6oz')) {
      return MASTER_DATA.references.filter(
        (r) => r.includes('6 OZ') || r.includes('6OZ') || r.includes('6 oz')
      );
    }
    return MASTER_DATA.references;
  }
};

