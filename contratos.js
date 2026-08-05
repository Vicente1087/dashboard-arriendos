// Datos de contratos mantenidos A MANO (no vienen del Google Sheet, no se
// borran cuando se actualizan los datos de arriendo). Se combinan con la lista
// de propiedades por el nombre EXACTO de la propiedad.
//
// Para agregar una propiedad nueva, cópiate el bloque de abajo y complétalo.
const CONTRATOS = {
  "Carmén Sylva 2315, Dpto 507": {
    arrendatario: "Felipe Eduardo Bustos Avila",
    aliasCuenta: "FELIPE EDUARDO BUST", // como aparece en la cuenta del banco al depositar
    telefono: "+56 9 6908 3773",
    correo: "felipebustosa@gmail.com",
    vencimientoContrato: "2027-03-30",
    montoUF: 13,
    notaMontoUF: "13,5 UF si se paga después del día 5 de cada mes",
    garantia: 520000,
    driveContrato: "https://drive.google.com/file/d/1h-OngSQVezdVXpyTUWywkfFdIU8u8HcD/view?usp=drive_link",
  },
  "Callao 3600 Dpto 305 (Hendaya)": {
    arrendatario: "Elsa Patricia Arriagada Rubilar",
    aliasCuenta: "ELSA PATRICIA ARRIA",
    telefono: "+56 9 9486 6779",
    correo: "pitufinarriagada@gmail.com",
    vencimientoContrato: "2027-03-01",
    montoUF: 11.73,
    notaMontoUF: "12 UF si se paga después del día 5 de cada mes",
    garantia: 450000,
    driveContrato: "https://drive.google.com/file/d/13forOK5_YV58UGxZLYmdNUInljS3iS-x/view?usp=sharing",
  },
  "Callao/Vecinal 2970, Of. 903 + Estacionamiento 120": {
    arrendatario: "Patricio Rojas Rosales",
    aliasCuenta: "Patricio Eugenio Rojas Ro",
    telefono: "+56 9 6728 1633",
    correo: "recta_provincia@hotmail.com",
    vencimientoContrato: "2027-03-30",
    montoUF: 13,
    notaMontoUF: "14 UF si se paga después del día 5 de cada mes",
    garantia: 520000,
    driveContrato: "https://drive.google.com/file/d/1UyQiJpJbfdl8yWqxiYCV8paq8zvB2acL/view?usp=sharing",
  },
  "Dante 4200, Dpto 707, Estacionamiento 12, Bodega 9": {
    arrendatario: "Consultora Geotech SpA",
    contactoNombre: "Contacto: Fredy Bustos Mendoza",
    aliasCuenta: "CONSULTORA GEOTECH SPA",
    vencimientoContrato: "2026-08-01",
    montoUF: 20,
    garantia: "20 UF",
    driveContrato: "https://drive.google.com/file/d/1UbtN8mCjm99UvHyR4X2HzVy8mqjOBP5w/view?usp=sharing",
  },
  "Málaga 115. Estacionamiento 143,": {
    arrendatario: "Carlos Alberto Contreras Oyarce",
    aliasCuenta: "CONTRERAS OYARCE CARLOS ALBERTO",
    telefono: "+56 9 8147 7264",
    correo: "carloscontrerasoyarce@gmail.com",
    vencimientoContrato: "2026-12-30",
    montoUF: 2.02,
    garantia: 80000,
    driveContrato: "https://drive.google.com/file/d/1L0qZ3ZoBVYNVa1BStTR7o61hvtiFazIo/view?usp=sharing",
  },
  "Málaga 115, Of. 605": {
    arrendatario: "Paulina Andrea Acevedo Meza",
    aliasCuenta: "PAULINA ANDREA ACEV",
    telefono: "+56 9 3957 7350",
    correo: "p.acevedomeza@gmail.com",
    aval: "Angela Beatriz Meza Concha",
    vencimientoContrato: "2027-07-30",
    montoUF: 7.5,
    notaMontoUF: "9,0 UF si se paga después del día 5 de cada mes",
    garantia: 300000,
    driveContrato: "https://drive.google.com/file/d/1bQjm4224KtDTZJZEjxO05ryFxxFdHBDe/view?usp=sharing",
  },
  "Málaga 115, Of 710, Estacionamiento 31": {
    arrendatario: "Estudio Fer Quiroz SpA",
    contactoNombre: "Contacto: Fernanda Macarena Quiróz Osorio",
    aliasCuenta: "ESTUDIO FER QUIROZ",
    telefono: "+56 9 7238 2038",
    correo: "ferquiroz.o@hotmail.com",
    vencimientoContrato: "2027-02-28",
    montoUF: 9.75,
    notaMontoUF: "11 UF si se paga después del día 5 de cada mes",
    garantia: 330000,
    driveContrato: "https://drive.google.com/file/d/1Y2E2Y_qDPsBeIGSR2rWhm7kesuRJp6L4/view?usp=sharing",
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONTRATOS };
}
