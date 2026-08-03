// Datos de ejemplo (mismo formato de tu Google Sheet). Más adelante los reemplazamos
// por los datos reales, leyendo el CSV publicado del Sheet.
const propiedades = [
  { propiedad: "Ahumada 312, Of. 720", arrendatario: "Felipe Eduardo Bustos", renta: 186667, garantia: 186667, pagado: true },
  { propiedad: "Carmen Sylva 2315, Dpto 507", arrendatario: "Reinoso Vivanco", renta: 530803, garantia: 160670, pagado: true },
  { propiedad: "11 de Septiembre 2909, Of. 810", arrendatario: "Héctor Patricio Magna Paula Macarena", renta: 449023, garantia: 436795, pagado: false },
  { propiedad: "Napoleón 3565, Of. 605 + Estacionamiento 62", arrendatario: "Centro Terapeutico y de Formación Or.", renta: 331078, garantia: 330937, pagado: false },
  { propiedad: "Callao 3600, Of. 405 (Hendaya)", arrendatario: "Jennifer Armijo o Manuel Armijo", renta: 466576, garantia: 450000, pagado: true },
  { propiedad: "Málaga 115, Of. 605", arrendatario: "Patricio Eugenio R.", renta: 173509, garantia: 515509, pagado: false },
];

function formatoCLP(numero) {
  return numero.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function pintarTabla(datos) {
  const tbody = document.getElementById("tabla-propiedades");
  tbody.innerHTML = "";

  for (const p of datos) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.propiedad}</td>
      <td>${p.arrendatario}</td>
      <td>${formatoCLP(p.renta)}</td>
      <td>${formatoCLP(p.garantia)}</td>
      <td><span class="estado ${p.pagado ? "estado-pagado" : "estado-pendiente"}">${p.pagado ? "Pagado" : "Pendiente"}</span></td>
    `;
    tbody.appendChild(fila);
  }
}

function pintarResumen(datos) {
  const totalIngresos = datos.filter(p => p.pagado).reduce((suma, p) => suma + p.renta, 0);
  const pendientes = datos.filter(p => !p.pagado).length;

  document.getElementById("total-ingresos").textContent = formatoCLP(totalIngresos);
  document.getElementById("total-propiedades").textContent = datos.length;
  document.getElementById("total-pendientes").textContent = pendientes;
}

pintarTabla(propiedades);
pintarResumen(propiedades);
