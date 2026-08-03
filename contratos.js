// Datos de contratos mantenidos A MANO (no vienen del Google Sheet, no se
// borran cuando se actualizan los datos de arriendo). Se combinan con la lista
// de propiedades por el nombre EXACTO de la propiedad.
//
// Para agregar una propiedad nueva, cópiate el bloque de abajo y complétalo.
const CONTRATOS = {
  "Carmén Sylva 2315, Dpto 507": {
    arrendatario: "Felipe Eduardo Bustos Avila",
    aliasCuenta: "Felipe Eduardo Bustos Avila", // como aparece en la cuenta del banco al depositar
    telefono: "+56 9 6908 3773",
    correo: "felipebustosa@gmail.com",
    vencimientoContrato: "2027-03-30",
    montoUF: 13,
    notaMontoUF: "13,5 UF si se paga después del día 5 de cada mes",
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONTRATOS };
}
