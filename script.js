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

  document.getElementById("pasado-label-vs-mes-anterior").textContent = `Vs. ${nombreMes(TAB_MES.mesAntesDelPasado)}`;
  const vsMesAnterior = formatoVariacion(TAB_MES.pasado.total, TAB_MES.totalMesAntesDelPasado);
  const elVsMesAnterior = document.getElementById("pasado-vs-mes-anterior");
  elVsMesAnterior.textContent = vsMesAnterior.texto;
  elVsMesAnterior.className = `card-value ${vsMesAnterior.clase}`;

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

  // Bloque: año actual (en curso, informativo)
  document.getElementById("titulo-anio-actual").textContent = `Año actual: ${TAB_ANIO.anioActual}`;
  document.getElementById("anio-label-acumulado").textContent = `Acumulado ${TAB_ANIO.anioActual} (${TAB_ANIO.mesesIncluidos} meses)`;
  document.getElementById("anio-acumulado").textContent = formatoCLP(TAB_ANIO.acumuladoAnioActual);

  const itemsAcumulado = Object.entries(TAB_ANIO.acumuladoMismoRangoAniosAnteriores)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  itemsAcumulado.push({ etiqueta: String(TAB_ANIO.anioActual), valor: TAB_ANIO.acumuladoAnioActual });
  pintarBarras("grafico-acumulado-anio", itemsAcumulado, String(TAB_ANIO.anioActual));

  // Bloque: año pasado (cerrado, la comparación justa)
  document.getElementById("titulo-anio-pasado").textContent = `Año pasado: ${TAB_ANIO.anioPasado}`;
  document.getElementById("anio-pasado-total").textContent = formatoCLP(TAB_ANIO.totalAnioPasado);

  const aniosCompletos = Object.keys(TAB_ANIO.totalesAnioCompleto).map(Number);
  const anioAnterior = Math.max(...aniosCompletos.filter((a) => a < TAB_ANIO.anioPasado));
  const vsAnterior = formatoVariacion(TAB_ANIO.totalAnioPasado, TAB_ANIO.totalesAnioCompleto[anioAnterior]);
  const elVsAnterior = document.getElementById("anio-pasado-vs-anterior");
  elVsAnterior.textContent = vsAnterior.texto;
  elVsAnterior.className = `card-value ${vsAnterior.clase}`;

  const itemsAnioCompleto = Object.entries(TAB_ANIO.totalesAnioCompleto)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => ({ etiqueta: anio, valor }));
  pintarBarras("grafico-anio-completo", itemsAnioCompleto, String(TAB_ANIO.anioPasado));
}

const DIA_EN_MS = 1000 * 60 * 60 * 24;
const DIAS_AVISO_VENCIMIENTO = 60;

function celdaArrendatario(nombre, contrato) {
  if (!nombre) return "-";
  if (!contrato || (!contrato.telefono && !contrato.correo && !contrato.contactoNombre && !contrato.aval)) return nombre;
  const aval = contrato.aval ? `Aval: ${contrato.aval}` : null;
  const datos = [contrato.contactoNombre, contrato.telefono, contrato.correo, aval].filter(Boolean).join(" · ");
  return `<span class="con-tooltip" tabindex="0">${nombre}<span class="tooltip-caja">${datos}</span></span>`;
}

function celdaVencimiento(vencimientoISO) {
  if (!vencimientoISO) return `<span class="dato-faltante">Falta info</span>`;
  const hoy = new Date();
  const fechaVencimiento = new Date(vencimientoISO + "T00:00:00");
  const diasRestantes = Math.round((fechaVencimiento - hoy) / DIA_EN_MS);
  const dd = String(fechaVencimiento.getDate()).padStart(2, "0");
  const mm = String(fechaVencimiento.getMonth() + 1).padStart(2, "0");
  const yy = String(fechaVencimiento.getFullYear()).slice(2);
  const fechaLegible = `${dd}/${mm}/${yy}`;

  if (diasRestantes < 0) {
    return `<span class="vencimiento-vencido">⚠ Venció el ${fechaLegible}</span>`;
  }
  if (diasRestantes <= DIAS_AVISO_VENCIMIENTO) {
    return `<span class="vencimiento-pronto">⚠ Vence en ${diasRestantes} días (${fechaLegible})</span>`;
  }
  return `<span class="vencimiento-ok">${fechaLegible}</span>`;
}

function celdaMontoUF(contrato) {
  if (!contrato || !contrato.montoUF) return `<span class="dato-faltante">Falta info</span>`;
  const texto = `${contrato.montoUF} UF`;
  if (!contrato.notaMontoUF) return texto;
  return `<span class="con-tooltip" tabindex="0">${texto}<span class="tooltip-caja">${contrato.notaMontoUF}</span></span>`;
}

function celdaContrato(contrato) {
  if (!contrato || !contrato.driveContrato) return `<span class="dato-faltante">Falta info</span>`;
  return `<a href="${contrato.driveContrato}" target="_blank" rel="noopener">Ver contrato</a>`;
}

function celdaGarantia(contrato, garantiaRaw) {
  if (contrato && contrato.garantia) {
    const texto = typeof contrato.garantia === "number" ? formatoCLP(contrato.garantia) : contrato.garantia;
    return `<span title="Monto verificado en el contrato">${texto}</span>`;
  }
  return `<span class="garantia-cruda">${garantiaRaw || "-"}</span>`;
}

function contratoVencido(contrato) {
  if (!contrato || !contrato.vencimientoContrato) return false;
  const hoy = new Date();
  const fechaVencimiento = new Date(contrato.vencimientoContrato + "T00:00:00");
  return fechaVencimiento < hoy;
}

function claseFila(categoria, contrato) {
  if (categoria === "uso-interno") return "fila-uso-interno";
  if (categoria === "remodelacion") return "fila-remodelacion";
  if (categoria === "vacante") return "fila-vacante";
  // categoria "arrendada": verde si está al día, naranjo si el contrato venció, rojo si falta la ficha
  if (!contrato) return "fila-falta-info";
  return contratoVencido(contrato) ? "fila-vencido" : "fila-arrendada";
}

// Categorías que no necesitan ficha de contrato - se muestran con una sola
// etiqueta en la columna Arrendatario y un guión limpio en el resto, en vez
// de repetir la misma palabra 5 veces por fila.
const ETIQUETA_CATEGORIA = {
  "uso-interno": "Uso interno",
  remodelacion: "En remodelación",
  vacante: "Desocupada / Disponible",
};

function pintarTabPropiedades() {
  const CONTRATOS_LOCAL = typeof CONTRATOS !== "undefined" ? CONTRATOS : {};
  const ESTADOS_LOCAL = typeof ESTADOS !== "undefined" ? ESTADOS : {};
  const tbody = document.getElementById("tabla-propiedades");
  tbody.innerHTML = estado.TAB_PROPIEDADES.map((p) => {
    const contrato = CONTRATOS_LOCAL[p.propiedad];
    const categoria = ESTADOS_LOCAL[p.propiedad] || "arrendada";
    const etiqueta = ETIQUETA_CATEGORIA[categoria];

    if (etiqueta) {
      return `
        <tr class="${claseFila(categoria, contrato)}">
          <td>${p.propiedad}</td>
          <td>${etiqueta}</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
        </tr>
      `;
    }

    const arrendatario = (contrato && contrato.arrendatario) || p.arrendatario;
    return `
      <tr class="${claseFila(categoria, contrato)}">
        <td>${p.propiedad}</td>
        <td>${celdaArrendatario(arrendatario, contrato)}</td>
        <td>${celdaVencimiento(contrato && contrato.vencimientoContrato)}</td>
        <td>${(contrato && contrato.aliasCuenta) || `<span class="dato-faltante">Falta info</span>`}</td>
        <td>${celdaMontoUF(contrato)}</td>
        <td>${celdaGarantia(contrato, p.garantiaRaw)}</td>
        <td>${celdaContrato(contrato)}</td>
      </tr>
    `;
  }).join("");
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
      const { TAB_MES, TAB_ANIO, TAB_PROPIEDADES } = procesarCSV(csvTexto, undefined, typeof ESTADOS !== "undefined" ? ESTADOS : {});
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
