// TAB_MES, TAB_ANIO, TAB_PROPIEDADES y ULTIMA_ACTUALIZACION vienen de datos.js
// (el respaldo del robot diario). procesarCSV() viene de procesar.js (lógica
// compartida). Este archivo solo pinta la página y maneja el botón "Actualizar ahora".

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBo8pYbwsHR_gER1bxky_t-v088sUKUe5fJjEQHvksTUCHIgdUdbM3OjW7j9k_7A/pub?gid=549998238&single=true&output=csv";

const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Estado actual mostrado en pantalla - arranca con lo que trajo el robot diario,
// y se reemplaza cada vez que alguien aprieta "Actualizar ahora".
let estado = { TAB_MES, TAB_ANIO, TAB_PROPIEDADES, ultimaActualizacion: ULTIMA_ACTUALIZACION };

function formatoCLP(numero) {
  return numero.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function nombreMes(claveISO) {
  const [anio, mes] = claveISO.split("-");
  return `${MESES_LARGO[parseInt(mes, 10) - 1]} ${anio}`;
}

function formatoVariacion(actual, anterior) {
  if (!anterior) return { texto: "sin datos para comparar", clase: "" };
  const variacion = ((actual - anterior) / anterior) * 100;
  const signo = variacion >= 0 ? "+" : "";
  const clase = variacion >= 0 ? "positivo" : "negativo";
  return { texto: `${signo}${variacion.toFixed(1)}% vs. ${formatoCLP(anterior)}`, clase };
}

function pintarBarras(contenedorId, items, claveActual) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = items
    .map((i) => {
      const porcentaje = Math.round((i.valor / max) * 100);
      const esActual = i.etiqueta === claveActual;
      return `
        <div class="barra-fila">
          <span>${i.etiqueta}</span>
          <div class="barra-pista"><div class="barra-relleno ${esActual ? "actual" : ""}" style="width:${porcentaje}%"></div></div>
          <span class="barra-valor">${formatoCLP(i.valor)}</span>
        </div>
      `;
    })
    .join("");
}

function pintarLista(id, propiedades) {
  const el = document.getElementById(id);
  el.innerHTML =
    propiedades.length === 0
      ? `<li class="vacio">Ninguna.</li>`
      : propiedades.map((p) => `<li>${p}</li>`).join("");
}

function pintarUltimaActualizacion() {
  const fecha = new Date(estado.ultimaActualizacion);
  const texto = fecha.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
  document.getElementById("ultima-actualizacion").textContent = `Datos al ${texto}`;
}

function pintarTabMes() {
  const TAB_MES = estado.TAB_MES;
  document.getElementById("subtitulo-mes").textContent =
    `${nombreMes(TAB_MES.mesActual)} en curso · comparando contra ${nombreMes(TAB_MES.mesPasado)} (mes cerrado)`;

  document.getElementById("titulo-mes-actual").textContent = `Mes actual: ${nombreMes(TAB_MES.mesActual)}`;
  document.getElementById("actual-total").textContent = formatoCLP(TAB_MES.actual.total);
  document.getElementById("actual-pagando").textContent = `${TAB_MES.actual.pagando} / ${TAB_MES.actual.totalPropiedades}`;
  pintarLista("actual-pendientes", TAB_MES.actual.pendientes);

  document.getElementById("titulo-mes-pasado").textContent = `Mes pasado: ${nombreMes(TAB_MES.mesPasado)}`;
  document.getElementById("pasado-total").textContent = formatoCLP(TAB_MES.pasado.total);
  pintarLista("pasado-pendientes", TAB_MES.pasado.pendientes);

  const anioPasado = Math.max(...Object.keys(TAB_MES.totalesMismoMesAniosAnteriores).map(Number));
  const totalAnioPasado = TAB_MES.totalesMismoMesAniosAnteriores[anioPasado];
  const vsAnioPasado = formatoVariacion(TAB_MES.pasado.total, totalAnioPasado);
  const elAnioPasado = document.getElementById("pasado-vs-anio-pasado");
  elAnioPasado.textContent = vsAnioPasado.texto;
  elAnioPasado.className = `card-value ${vsAnioPasado.clase}`;

  const itemsMismoMes = Object.entries(TAB_MES.totalesMismoMesAniosAnteriores)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  itemsMismoMes.push({ etiqueta: TAB_MES.mesPasado.split("-")[0], valor: TAB_MES.pasado.total });
  pintarBarras("grafico-mismo-mes", itemsMismoMes, itemsMismoMes[itemsMismoMes.length - 1].etiqueta);
}

function pintarTabAnio() {
  const TAB_ANIO = estado.TAB_ANIO;
  document.getElementById("anio-label-acumulado").textContent = `Acumulado ${TAB_ANIO.anioActual} (${TAB_ANIO.mesesIncluidos} meses)`;
  document.getElementById("anio-acumulado").textContent = formatoCLP(TAB_ANIO.acumuladoAnioActual);

  const anioPasado = Math.max(...Object.keys(TAB_ANIO.acumuladoMismoRangoAniosAnteriores).map(Number));
  const vsPasado = formatoVariacion(TAB_ANIO.acumuladoAnioActual, TAB_ANIO.acumuladoMismoRangoAniosAnteriores[anioPasado]);
  const elVsPasado = document.getElementById("anio-vs-pasado");
  elVsPasado.textContent = vsPasado.texto;
  elVsPasado.className = `card-value ${vsPasado.clase}`;

  const itemsAcumulado = Object.entries(TAB_ANIO.acumuladoMismoRangoAniosAnteriores)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  itemsAcumulado.push({ etiqueta: String(TAB_ANIO.anioActual), valor: TAB_ANIO.acumuladoAnioActual });
  pintarBarras("grafico-acumulado-anio", itemsAcumulado, String(TAB_ANIO.anioActual));

  const itemsAnioCompleto = Object.entries(TAB_ANIO.totalesAnioCompleto)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  pintarBarras("grafico-anio-completo", itemsAnioCompleto, null);
}

function pintarTabPropiedades() {
  const tbody = document.getElementById("tabla-propiedades");
  tbody.innerHTML = estado.TAB_PROPIEDADES.map(
    (p) => `
      <tr>
        <td>${p.propiedad}</td>
        <td>${p.arrendatario || "-"}</td>
        <td class="vacio">${p.vencimientoContrato}</td>
        <td class="vacio">${p.montoUF}</td>
        <td class="garantia-cruda">${p.garantiaRaw || "-"}</td>
      </tr>
    `
  ).join("");
}

function pintarTodo() {
  pintarUltimaActualizacion();
  pintarTabMes();
  pintarTabAnio();
  pintarTabPropiedades();
}

function activarTabs() {
  document.querySelectorAll(".tab-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("activo"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("activo"));
      boton.classList.add("activo");
      document.getElementById(`tab-${boton.dataset.tab}`).classList.add("activo");
    });
  });
}

function activarBotonActualizar() {
  const boton = document.getElementById("btn-actualizar");
  boton.addEventListener("click", async () => {
    boton.disabled = true;
    boton.classList.remove("error");
    const textoOriginal = boton.textContent;
    boton.textContent = "Actualizando...";
    try {
      const res = await fetch(CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`El Google Sheet respondió con error ${res.status}`);
      const csvTexto = await res.text();
      const { TAB_MES, TAB_ANIO, TAB_PROPIEDADES } = procesarCSV(csvTexto);
      estado = { TAB_MES, TAB_ANIO, TAB_PROPIEDADES, ultimaActualizacion: new Date().toISOString() };
      pintarTodo();
      boton.textContent = textoOriginal;
    } catch (err) {
      boton.textContent = "Error, reintentar";
      boton.classList.add("error");
      console.error("No se pudo actualizar:", err);
    } finally {
      boton.disabled = false;
    }
  });
}

pintarTodo();
activarTabs();
activarBotonActualizar();
