"use client";
import React, { useEffect, useState } from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import {
  money,
  num,
  pct,
  today,
  addDays,
  periodRate,
  scheduleFor,
} from "@/lib/format";
import { frequencies, fuels, methods } from "@/data/demo";
import { financialEvents } from "@/lib/finance/domain";
const {
  Btn,
  Badge,
  Field,
  CardBox,
  Stat,
  Detail,
  Modal,
  ConfirmDialog,
  Pagination,
  Icon,
  PageHead,
} = UI;

function BudgetPage({
  movements,
  rows,
  setRows,
  onRemove,
}: {
  movements: T.Movement[];
  rows: T.Budget[];
  setRows: React.Dispatch<React.SetStateAction<T.Budget[]>>;
  onRemove?: (id: string) => void;
}) {
  const [editing, setEditing] = useState<T.Budget | null>(null);
  const [show, setShow] = useState(false);
  const [view, setView] = useState<"all" | "over" | "safe" | "inactive">("all");
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toLocaleDateString("en-CA");
  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
  const monthEndIso = monthEnd.toLocaleDateString("en-CA");
  const weekStart = new Date();
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const weekStartIso = weekStart.toLocaleDateString("en-CA");
  const yearStart = `${new Date().getFullYear()}-01-01`,
    yearEnd = `${new Date().getFullYear()}-12-31`;
  const spentFor = (r: T.Budget) => {
    let from = monthStartIso,
      to = monthEndIso;
    if (r.period === "Semanal") {
      from = weekStartIso;
      to = today;
    } else if (r.period === "Anual") {
      from = yearStart;
      to = yearEnd;
    }
    return movements
      .filter(
        (m) =>
          m.date >= from &&
          m.date <= to &&
          m.category === r.category &&
          (m.currency || "PEN") === "PEN" &&
          m.type === "Gasto" &&
          m.affectsPnl !== false &&
          m.status !== "Anulado",
      )
      .reduce((a, m) => a + Number(m.amount || 0), 0);
  };
  const activeRows = rows.filter((r) => r.active !== false);
  const totalByPeriod = (period: T.Budget["period"]) =>
    activeRows
      .filter((r) => r.period === period)
      .reduce((a, r) => a + Number(r.limit || 0), 0);
  const spentByPeriod = (period: T.Budget["period"]) =>
    activeRows
      .filter((r) => r.period === period)
      .reduce((a, r) => a + spentFor(r), 0);
  const monthlyBudget = totalByPeriod("Mensual"),
    monthlySpent = spentByPeriod("Mensual"),
    monthlyRemaining = monthlyBudget - monthlySpent;
  const overCount = activeRows.filter(
    (r) => spentFor(r) > Number(r.limit || 0),
  ).length;
  const categories = Array.from(
    new Set(movements.map((m) => m.category)),
  ).sort();
  const filtered = rows.filter((r) =>
    view === "all" || view === "inactive"
      ? view === "all" || r.active === false
      : view === "over"
        ? r.active !== false && spentFor(r) > Number(r.limit || 0)
        : r.active !== false && spentFor(r) <= Number(r.limit || 0),
  );
  const highest = [...activeRows].sort((a, b) => spentFor(b) - spentFor(a))[0];
  const highestRatio = [...activeRows].sort(
    (a, b) =>
      spentFor(b) / (Number(b.limit) || 1) -
      spentFor(a) / (Number(a.limit) || 1),
  )[0];
  const saveBudget = (r: T.Budget) => {
    setRows((p) =>
      p.some((x) => x.id === r.id)
        ? p.map((x) => (x.id === r.id ? r : x))
        : [{ ...r, id: Date.now() }, ...p],
    );
    setShow(false);
    setEditing(null);
  };
  return (
    <div className="budgetPage">
      <PageHead
        title="Presupuesto"
        desc="Define límites por periodo y categoría, compara el gasto real y actúa antes de excederte. En el demo los presupuestos se controlan en PEN."
        action="Nueva partida"
        onAction={() => {
          setEditing(null);
          setShow(true);
        }}
      />
      <div className="budgetHero">
        <div className="budgetHeroMain">
          <small>CONTROL MENSUAL</small>
          <h2>{money(Math.max(0, monthlyRemaining))}</h2>
          <p>
            {monthlyBudget
              ? monthlyRemaining >= 0
                ? "Disponible dentro de tus límites"
                : "Presupuesto mensual excedido en " +
                  money(Math.abs(monthlyRemaining))
              : "Aún no tienes partidas mensuales activas"}
          </p>
          <div className="budgetHeroTrack">
            <i
              style={{
                width: `${monthlyBudget ? Math.min(100, Math.max(0, (monthlySpent / monthlyBudget) * 100)) : 0}%`,
              }}
            />
          </div>
          <div className="budgetHeroMeta">
            <span>{money(monthlySpent)} gastado</span>
            <b>
              {monthlyBudget
                ? Math.round((monthlySpent / monthlyBudget) * 100)
                : 0}
              % utilizado
            </b>
            <span>{money(monthlyBudget)} presupuestado</span>
          </div>
        </div>
        <div className="budgetHeroSide">
          <span>MAYOR PRESIÓN</span>
          <b>{highestRatio?.name || "Sin partidas activas"}</b>
          <strong>
            {highestRatio
              ? Math.round(
                  Math.min(
                    999,
                    (spentFor(highestRatio) /
                      (Number(highestRatio.limit) || 1)) *
                      100,
                  ),
                )
              : 0}
            %
          </strong>
          <small>
            {highestRatio
              ? `${money(spentFor(highestRatio))} de ${money(highestRatio.limit)} · ${highestRatio.period}`
              : "Crea una partida para empezar"}
          </small>
        </div>
      </div>
      <div className="stats">
        <Stat
          label="Mensual"
          value={money(monthlyBudget)}
          sub={`${money(monthlySpent)} gastado`}
          tone={monthlyRemaining < 0 ? "red" : ""}
        />
        <Stat
          label="Semanal"
          value={money(totalByPeriod("Semanal"))}
          sub={`${money(spentByPeriod("Semanal"))} gastado`}
        />
        <Stat
          label="Anual"
          value={money(totalByPeriod("Anual"))}
          sub={`${money(spentByPeriod("Anual"))} gastado`}
        />
        <Stat
          label="En alerta"
          value={String(overCount)}
          sub={`${activeRows.length} partidas activas`}
          tone={overCount ? "red" : "green"}
        />
      </div>
      <div className="budgetDecisionGrid">
        <CardBox title="Comparación por periodo">
          <div className="budgetBars">
            {(["Mensual", "Semanal", "Anual"] as T.Budget["period"][]).map(
              (period) => {
                const b = totalByPeriod(period),
                  spent = spentByPeriod(period),
                  ratio = b ? spent / b : 0;
                return (
                  <div className="budgetBarRow" key={period}>
                    <div>
                      <span>{period}</span>
                      <b>
                        {money(spent)} <small>/ {money(b)}</small>
                      </b>
                    </div>
                    <div className="budgetBarTrack">
                      <i
                        className={
                          ratio > 1 ? "over" : ratio >= 0.8 ? "warn" : ""
                        }
                        style={{
                          width: `${b ? Math.min(100, Math.max(3, ratio * 100)) : 3}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
          <p className="budgetFootnote">
            Solo se comparan gastos PEN dentro del periodo de cada partida. Los
            límites semanales, mensuales y anuales no se suman entre sí; los
            gastos USD quedan fuera para evitar mezclar monedas.
          </p>
        </CardBox>
        <CardBox title="Lectura para decidir">
          <div className="budgetInsights">
            <div>
              <span>01</span>
              <div>
                <b>
                  {overCount
                    ? `${overCount} partida${overCount > 1 ? "s" : ""} excedida${overCount > 1 ? "s" : ""}`
                    : "Ninguna partida supera su límite"}
                </b>
                <p>
                  {overCount
                    ? "Revisa primero las partidas excedidas y decide si debes reducir gasto o reajustar conscientemente el límite."
                    : "Tus límites activos están conteniendo el gasto registrado."}
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>
                  {monthlyBudget && monthlySpent / monthlyBudget >= 0.85
                    ? "Poco margen mensual"
                    : "Margen saludable"}
                </b>
                <p>
                  {monthlyBudget && monthlySpent / monthlyBudget >= 0.85
                    ? "Ya consumiste gran parte de tus límites mensuales."
                    : "Todavía existe espacio para gastos previstos."}
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>El periodo cambia la lectura</b>
                <p>
                  Una partida semanal se compara con la semana actual; una
                  anual, con el acumulado del año.
                </p>
              </div>
            </div>
          </div>
        </CardBox>
      </div>
      <CardBox
        title="Tus partidas"
        action="Nueva partida"
        onAction={() => {
          setEditing(null);
          setShow(true);
        }}
      >
        <div className="budgetToolbar">
          <div>
            <button
              className={view === "all" ? "active" : ""}
              onClick={() => setView("all")}
            >
              Activas <span>{activeRows.length}</span>
            </button>
            <button
              className={view === "over" ? "active" : ""}
              onClick={() => setView("over")}
            >
              En alerta <span>{overCount}</span>
            </button>
            <button
              className={view === "safe" ? "active" : ""}
              onClick={() => setView("safe")}
            >
              En control <span>{activeRows.length - overCount}</span>
            </button>
            <button
              className={view === "inactive" ? "active" : ""}
              onClick={() => setView("inactive")}
            >
              Pausadas <span>{rows.length - activeRows.length}</span>
            </button>
          </div>
          <small>
            El gasto se calcula por categoría, periodo y estado del movimiento.
          </small>
        </div>
        <div className="budgetTable">
          <div className="budgetTHead">
            <span>Partida</span>
            <span>Categoría</span>
            <span>Periodo</span>
            <span>Límite</span>
            <span>Gastado</span>
            <span>Disponible</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {filtered.map((r) => {
            const spent = spentFor(r),
              limit = Number(r.limit) || 0,
              diff = limit - spent,
              ratio = limit ? spent / limit : 0;
            return (
              <div className="budgetTRow" key={r.id}>
                <div>
                  <b>{r.name}</b>
                  <small>
                    {r.active === false
                      ? "Pausada"
                      : `${Math.round(Math.min(999, ratio * 100))}% utilizado`}
                  </small>
                </div>
                <span>{r.category}</span>
                <span>
                  <Badge tone="info">{r.period}</Badge>
                </span>
                <strong>{money(limit)}</strong>
                <strong>{money(spent)}</strong>
                <strong className={diff < 0 ? "red" : ""}>
                  {money(Math.abs(diff))}
                </strong>
                <span>
                  <Badge
                    tone={
                      r.active === false
                        ? "neutral"
                        : diff < 0
                          ? "red"
                          : ratio >= 0.8
                            ? "warn"
                            : "green"
                    }
                  >
                    {r.active === false
                      ? "Pausada"
                      : diff < 0
                        ? "Excedido"
                        : ratio >= 0.8
                          ? "Cerca del límite"
                          : "En control"}
                  </Badge>
                </span>
                <div className="actions">
                  <button
                    onClick={() => {
                      setEditing(r);
                      setShow(true);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="dangerText"
                    onClick={() =>
                      onRemove
                        ? onRemove(String(r.id))
                        : setRows((p) => p.filter((x) => x.id !== r.id))
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {!filtered.length && (
          <div className="budgetEmpty">
            <b>No hay partidas en esta vista.</b>
            <span>Crea una nueva o cambia el filtro.</span>
          </div>
        )}
      </CardBox>
      <div className="budgetBottomGrid">
        <CardBox title="Moneda del presupuesto">
          <div className="budgetRule">
            <strong>PEN por ahora</strong>
            <p>
              Este demo mantiene los límites en soles para que una partida nunca
              mezcle PEN y USD. La gestión multi-moneda se resolverá al conectar
              la base de datos.
            </p>
          </div>
        </CardBox>
        <CardBox title="Regla recomendada">
          <div className="budgetRule">
            <strong>
              {monthlyRemaining < 0
                ? "Recalibra antes de seguir gastando"
                : "Revisa semanalmente"}
            </strong>
            <p>
              {monthlyRemaining < 0
                ? "Un exceso debe quedar visible y explicarse; no lo ocultes con límites artificiales."
                : "Compara el gasto real con cada límite y ajusta antes de llegar al final del periodo."}
            </p>
          </div>
        </CardBox>
        <CardBox title="Categorías detectadas">
          <div className="categoryChips">
            {categories.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </CardBox>
      </div>
      {show && (
        <BudgetModal
          data={editing}
          categories={categories}
          close={() => {
            setShow(false);
            setEditing(null);
          }}
          save={saveBudget}
        />
      )}
    </div>
  );
}
function BudgetModal({
  data,
  categories,
  close,
  save,
}: {
  data: T.Budget | null;
  categories: string[];
  close: () => void;
  save: (r: T.Budget) => void;
}) {
  const [name, setName] = useState(data?.name || "");
  const [category, setCategory] = useState(
    data?.category || categories[0] || "Personal",
  );
  const [limit, setLimit] = useState(data ? String(data.limit) : "");
  const [period, setPeriod] = useState<T.Budget["period"]>(
    data?.period || "Mensual",
  );
  const [active, setActive] = useState(data?.active !== false);
  const submit = () => {
    const n = Number(limit);
    if (!name.trim() || !Number.isFinite(n) || n <= 0) return;
    save({
      id: data?.id || Date.now(),
      name: name.trim(),
      category,
      limit: n,
      period,
      active,
    });
  };
  return (
    <Modal title={data ? "Editar partida" : "Nueva partida"} close={close}>
      <p className="modalIntro">
        El límite se compara automáticamente con los gastos de la misma
        categoría dentro del periodo elegido.
      </p>
      <Field label="Nombre">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Alimentación"
        />
      </Field>
      <div className="form2">
        <Field label="Categoría">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
            {!categories.includes("Personal") && <option>Personal</option>}
          </select>
        </Field>
        <Field label="Límite">
          <input
            inputMode="decimal"
            type="number"
            min="0.01"
            step="0.01"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="800"
          />
        </Field>
        <Field label="Periodo">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as T.Budget["period"])}
          >
            <option>Semanal</option>
            <option>Mensual</option>
            <option>Anual</option>
          </select>
        </Field>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />{" "}
        Partida activa
      </label>
      <div className="actions modalActions">
        <Btn secondary onClick={close}>
          Cancelar
        </Btn>
        <Btn onClick={submit}>{data ? "Guardar cambios" : "Crear partida"}</Btn>
      </div>
    </Modal>
  );
}

function SavingsPage({
  goals,
  goalMovements,
  open,
  remove,
  reverse,
}: {
  goals: T.Goal[];
  goalMovements: T.GoalMovement[];
  open: (m: string, d?: any) => void;
  remove: (id: string) => void;
  reverse: (m: T.GoalMovement) => void;
}) {
  const [goalConfirm, setGoalConfirm] = useState<T.GoalMovement | null>(null);
  useEffect(() => {
    const capture = (event: MouseEvent) => {
      const button = (event.target as Element).closest("button");
      if (button?.textContent?.trim() !== "Revertir") return;
      const row = button.closest(".investmentRow")?.textContent || "";
      const movement = goalMovements.find(
        (m) => row.includes(m.date) && row.includes(m.type),
      );
      if (movement) setGoalConfirm(movement);
    };
    document.addEventListener("mousedown", capture, true);
    return () => document.removeEventListener("mousedown", capture, true);
  }, [goalMovements]);
  const confirm = (_message: string) => false;
  const totalTarget = goals.reduce((a, g) => a + Number(g.target || 0), 0),
    totalCurrent = goals.reduce((a, g) => a + Number(g.current || 0), 0),
    remaining = Math.max(0, totalTarget - totalCurrent),
    progress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const completed = goals.filter(
    (g) => g.target > 0 && g.current >= g.target,
  ).length;
  const active = goals.filter((g) => g.target > 0 && g.current < g.target);
  const nearest = [...active].sort((a, b) =>
    String(a.deadline).localeCompare(String(b.deadline)),
  )[0];
  const topGoal = [...goals].sort(
    (a, b) => b.current / (b.target || 1) - a.current / (a.target || 1),
  )[0];
  const daysLeft = (d: string) =>
    Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86400000);
  const movementByGoal = (id: string) =>
    goalMovements
      .filter((m) => m.goalId === id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 3);
  return (
    <div className="savingsPage">
      <PageHead
        title="Ahorros y metas"
        desc="Define objetivos, registra aportes y retiros, revisa el historial y corrige movimientos sin perder trazabilidad."
        action="Nueva meta"
        onAction={() => open("goal")}
      />
      <div className="savingsHero">
        <div className="savingsHeroMain">
          <small>PROGRESO TOTAL</small>
          <div className="savingsHeroValue">
            <strong>{money(totalCurrent)}</strong>
            <span>de {money(totalTarget)}</span>
          </div>
          <div className="savingsHeroTrack">
            <i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <div className="savingsHeroMeta">
            <span>{Math.round(progress)}% completado</span>
            <b>{money(remaining)} por alcanzar</b>
          </div>
        </div>
        <div className="savingsHeroSide">
          <span>META MÁS AVANZADA</span>
          <b>{topGoal?.name || "Sin metas todavía"}</b>
          <strong>
            {topGoal
              ? Math.round(
                  Math.min(
                    100,
                    (topGoal.current / (topGoal.target || 1)) * 100,
                  ),
                )
              : 0}
            %
          </strong>
          <small>
            {topGoal
              ? `${money(topGoal.current)} de ${money(topGoal.target)}`
              : "Crea tu primera meta"}
          </small>
        </div>
      </div>
      <div className="stats">
        <Stat
          label="Metas activas"
          value={String(active.length)}
          sub={`${goals.length} registradas`}
        />
        <Stat
          label="Ahorrado"
          value={money(totalCurrent)}
          sub="Acumulado"
          tone="green"
        />
        <Stat
          label="Por alcanzar"
          value={money(remaining)}
          sub="Objetivos pendientes"
        />
        <Stat
          label="Completadas"
          value={String(completed)}
          sub={
            goals.length
              ? `${Math.round((completed / goals.length) * 100)}% de tus metas`
              : "Sin metas"
          }
          tone="green"
        />
      </div>
      <div className="savingsDecisionGrid">
        <CardBox title="Ritmo y próximos objetivos">
          <div className="savingsFocus">
            <div className="savingsFocusIcon">{nearest ? "→" : "✓"}</div>
            <div>
              <span>{nearest ? "PRÓXIMA META" : "ESTADO GENERAL"}</span>
              <b>{nearest?.name || "Todo en orden"}</b>
              <p>
                {nearest
                  ? `${daysLeft(nearest.deadline) >= 0 ? `Faltan ${daysLeft(nearest.deadline)} días` : "La fecha objetivo ya pasó"} · ${money(Math.max(0, nearest.target - nearest.current))} pendientes.`
                  : "No tienes metas pendientes de completar."}
              </p>
            </div>
          </div>
          <div className="savingsMiniGrid">
            <div>
              <span>Mayor objetivo</span>
              <b>
                {goals.length
                  ? money(Math.max(...goals.map((g) => g.target)))
                  : money(0)}
              </b>
            </div>
            <div>
              <span>Mayor avance</span>
              <b>
                {topGoal
                  ? `${Math.round(Math.min(100, (topGoal.current / (topGoal.target || 1)) * 100))}%`
                  : "0%"}
              </b>
            </div>
            <div>
              <span>Movimientos registrados</span>
              <b>{goalMovements.length}</b>
            </div>
          </div>
        </CardBox>
        <CardBox title="Lectura para decidir">
          <div className="savingsInsights">
            <div>
              <span>01</span>
              <div>
                <b>
                  {progress >= 75 ? "Vas muy bien" : "Construye constancia"}
                </b>
                <p>
                  {progress >= 75
                    ? "La mayor parte del objetivo agregado ya está cubierta."
                    : "La constancia de los aportes importa más que un único aporte grande."}
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>
                  {nearest && daysLeft(nearest.deadline) < 0
                    ? "Hay una meta atrasada"
                    : "Vigila las fechas"}
                </b>
                <p>
                  {nearest && daysLeft(nearest.deadline) < 0
                    ? "Ajusta plazo o ritmo con una decisión consciente."
                    : "La fecha convierte el ahorro en un compromiso medible."}
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>Las metas no mueven efectivo por sí solas</b>
                <p>
                  El aporte cambia el avance virtual de la meta; una
                  transferencia real entre cuentas es la que mueve liquidez.
                </p>
              </div>
            </div>
          </div>
        </CardBox>
      </div>
      <CardBox
        title="Tus metas"
        action="Nueva meta"
        onAction={() => open("goal")}
      >
        <div className="savingsTable">
          <div className="savingsTHead">
            <span>Meta</span>
            <span>Objetivo</span>
            <span>Actual</span>
            <span>Progreso</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {goals.map((g) => {
            const ratio = g.target > 0 ? g.current / g.target : 0,
              left = Math.max(0, g.target - g.current),
              days = daysLeft(g.deadline),
              done = ratio >= 1;
            return (
              <div className="savingsTRow" key={g.id}>
                <div>
                  <b>{g.name}</b>
                  <small>
                    {g.category} · {g.frequency}
                  </small>
                </div>
                <strong>{money(g.target)}</strong>
                <strong>{money(g.current)}</strong>
                <div className="savingsProgressCell">
                  <div className="progress">
                    <i
                      style={{
                        width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
                      }}
                    />
                  </div>
                  <small>
                    {Math.round(Math.min(100, ratio * 100))}% · {money(left)}{" "}
                    restante
                  </small>
                </div>
                <span>{g.deadline}</span>
                <span>
                  <Badge
                    tone={
                      done
                        ? "green"
                        : days < 0
                          ? "red"
                          : days <= 30
                            ? "warn"
                            : "green"
                    }
                  >
                    {done
                      ? "Completada"
                      : days < 0
                        ? "Atrasada"
                        : days <= 30
                          ? "Próxima"
                          : "En curso"}
                  </Badge>
                </span>
                <div className="actions">
                  <button onClick={() => open("goal", g)}>Editar</button>
                  <button onClick={() => open("goal-add", g)}>
                    Aportar / retirar
                  </button>
                  <button className="dangerText" onClick={() => remove(g.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {!goals.length && (
          <div className="savingsEmpty">
            <b>Aún no tienes metas</b>
            <span>Crea una meta para empezar.</span>
          </div>
        )}
      </CardBox>
      <CardBox title="Últimos movimientos de metas">
        <div className="investmentSummary">
          {goalMovements
            .slice()
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 10)
            .map((m) => {
              const g = goals.find((x) => x.id === m.goalId);
              return (
                <div className="investmentRow" key={String(m.id)}>
                  <div>
                    <b>{g?.name || "Meta eliminada"}</b>
                    <small>
                      {m.date} · {m.type} · {m.status}
                    </small>
                  </div>
                  <strong
                    className={m.type === "Aporte" ? "negative" : "positive"}
                  >
                    {m.type === "Aporte" ? "−" : "+"}
                    {money(m.amount)}
                  </strong>
                  <span className="actions">
                    {m.status !== "Anulado" && (
                      <button
                        onClick={() => setGoalConfirm(m)}
                      >
                        Revertir
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          {!goalMovements.length && (
            <div className="investmentEmpty">
              <b>Sin movimientos</b>
              <span>Los aportes y retiros aparecerán aquí.</span>
            </div>
          )}
        </div>
      </CardBox>
      <div className="savingsBottomGrid">
        <CardBox title="Cómo leer tu progreso">
          <div className="savingsRule">
            <strong>Objetivo → aporte → avance</strong>
            <p>
              Editar una meta cambia su objetivo y planificación; los cambios de
              saldo deben hacerse mediante movimientos para conservar historial.
            </p>
          </div>
        </CardBox>
        <CardBox title="Regla de liquidez">
          <div className="savingsRule">
            <strong>No cuentes dos veces el ahorro</strong>
            <p>
              La meta es una asignación virtual. Para mover dinero entre cuentas
              usa una transferencia, no un aporte de meta.
            </p>
          </div>
        </CardBox>
      </div>
      {goalConfirm && (
        <ConfirmDialog
          title="¿Revertir este movimiento?"
          message="El movimiento pasará a estado anulado y dejará de afectar el avance de la meta. Esta acción conserva el historial y no se puede deshacer."
          summary={
            <>
              <span>
                {goalConfirm.date} · {goalConfirm.type}
              </span>
              <b>{money(goalConfirm.amount)}</b>
            </>
          }
          confirmLabel="Revertir movimiento"
          onClose={() => setGoalConfirm(null)}
          onConfirm={() => {
            reverse(goalConfirm);
            setGoalConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function NetWorth({
  vehicles,
  cards,
  loans,
  debts,
  accountBalances,
  investments = [],
  investmentMovements = [],
  recurringExpenses = [],
  open,
  removeInvestment,
  reverseInvestment,
  removeRecurring,
}: {
  vehicles: T.Vehicle[];
  cards: T.Card[];
  loans: T.Loan[];
  debts: T.Debt[];
  accountBalances: T.FinancialAccount[];
  investments?: T.Investment[];
  investmentMovements?: T.InvestmentMovement[];
  recurringExpenses?: T.RecurringExpense[];
  open?: (m: string, d?: any) => void;
  removeInvestment?: (id: string) => void;
  reverseInvestment?: (m: T.InvestmentMovement) => void;
  removeRecurring?: (id: string) => void;
}) {
  const [investmentConfirm, setInvestmentConfirm] =
    useState<T.InvestmentMovement | null>(null);
  useEffect(() => {
    const capture = (event: MouseEvent) => {
      const button = (event.target as Element).closest("button");
      if (button?.textContent?.trim() !== "Revertir") return;
      const row = button.closest(".investmentRow")?.textContent || "";
      const movement = investmentMovements.find(
        (m) => row.includes(m.date) && row.includes(m.type),
      );
      if (movement) setInvestmentConfirm(movement);
    };
    document.addEventListener("mousedown", capture, true);
    return () => document.removeEventListener("mousedown", capture, true);
  }, [investmentMovements]);
  const confirm = (_message: string) => false;
  const cashByCurrency = {
    PEN: accountBalances
      .filter((a) => a.currency === "PEN")
      .reduce((a, m) => a + Number(m.balance || 0), 0),
    USD: accountBalances
      .filter((a) => a.currency === "USD")
      .reduce((a, m) => a + Number(m.balance || 0), 0),
  };
  const accountCurrency = (id?: string) =>
    accountBalances.find((a) => a.id === id)?.currency || "PEN";
  const vehicleAssets = vehicles.reduce((a, v) => a + Number(v.value || 0), 0);
  const receivables = loans
    .filter((l) => accountCurrency(l.accountId) === "PEN")
    .reduce((a, l) => a + Number(l.balance || 0), 0);
  const receivablesUSD = loans
    .filter((l) => accountCurrency(l.accountId) === "USD")
    .reduce((a, l) => a + Number(l.balance || 0), 0);
  const investmentAssets = investments
    .filter((i) => i.currency === "PEN")
    .reduce((a, i) => a + Number(i.currentValue || 0), 0);
  const investmentAssetsUSD = investments
    .filter((i) => i.currency === "USD")
    .reduce((a, i) => a + Number(i.currentValue || 0), 0);
  const cashAsset = Math.max(0, cashByCurrency.PEN);
  const assets = vehicleAssets + receivables + investmentAssets + cashAsset;
  const cardDebt = cards
    .filter((c) => c.currency === "PEN")
    .reduce((a, c) => a + Number(c.used || 0), 0);
  const otherDebt = debts
    .filter((d) => accountCurrency(d.accountId) === "PEN")
    .reduce((a, d) => a + Number(d.balance || 0), 0);
  const linkedVehicleIds = new Set(
    debts.filter((d) => d.vehicleId).map((d) => d.vehicleId),
  );
  const vehicleDebt = vehicles.reduce(
    (a, v) => a + (linkedVehicleIds.has(v.id) ? 0 : Number(v.debt || 0)),
    0,
  );
  const assetsUSD = cashByCurrency.USD + receivablesUSD + investmentAssetsUSD;
  const liabilitiesUSD =
    cards
      .filter((c) => c.currency === "USD")
      .reduce((a, c) => a + Number(c.used || 0), 0) +
    debts
      .filter((d) => accountCurrency(d.accountId) === "USD")
      .reduce((a, d) => a + Number(d.balance || 0), 0);
  const netUSD = assetsUSD - liabilitiesUSD;
  const liabilities = cardDebt + otherDebt + vehicleDebt;
  const net = assets - liabilities;
  const debtRatio = assets > 0 ? (liabilities / assets) * 100 : 0;
  const liquid = cashAsset;
  const assetRows = [
    ["Efectivo / cuentas", cashAsset],
    ["Vehículos", vehicleAssets],
    ["Préstamos por cobrar", receivables],
    ["Inversiones", investmentAssets],
  ] as [string, number][];
  const liabilityRows = [
    ["Tarjetas", cardDebt],
    ["Deudas financieras", otherDebt],
    ["Deuda vehicular", vehicleDebt],
  ] as [string, number][];
  const biggestAsset = [...assetRows].sort((a, b) => b[1] - a[1])[0];
  const biggestLiability = [...liabilityRows].sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="networthPage">
      <PageHead
        title="Patrimonio"
        desc="Una vista integral de lo que tienes, lo que debes y cómo tus ahorros y activos cambian tu patrimonio neto."
      />
      <div className="networthHero">
        <div className="networthHeroMain">
          <small>PATRIMONIO NETO</small>
          <strong>{money(net)}</strong>
          <span>
            Activos {money(assets)} · Pasivos {money(liabilities)}
          </span>
          <div className="networthHeroBar">
            <i
              style={{
                width: `${assets > 0 ? Math.min(100, Math.max(0, (net / assets) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="networthHeroSide">
          <span>NIVEL DE ENDEUDAMIENTO</span>
          <strong>{Math.round(debtRatio)}%</strong>
          <small>
            {debtRatio <= 30
              ? "Nivel contenido"
              : debtRatio <= 60
                ? "Requiere seguimiento"
                : "Presión elevada sobre tus activos"}
          </small>
        </div>
      </div>
      <div className="stats">
        <Stat
          label="Pasivos"
          value={money(liabilities)}
          sub={`${liabilityRows.filter((x) => x[1] > 0).length} fuentes`}
          tone={liabilities ? "red" : "green"}
        />
        <Stat
          label="Patrimonio líquido"
          value={money(liquid)}
          sub="Efectivo + ahorros"
        />
      </div>
      <div className="networthGrid">
        <CardBox title="Dónde está tu patrimonio">
          <div className="networthBars">
            {assetRows.map(([label, value]) => {
              const ratio = assets ? value / assets : 0;
              return (
                <div className="networthBarRow" key={label}>
                  <div>
                    <span>{label}</span>
                    <b>{money(value)}</b>
                  </div>
                  <div className="networthTrack">
                    <i
                      style={{
                        width: `${Math.min(100, Math.max(value ? 4 : 0, ratio * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBox>
        <CardBox title="Qué está reduciendo tu patrimonio">
          <div className="networthBars">
            {liabilityRows.map(([label, value]) => {
              const ratio = liabilities ? value / liabilities : 0;
              return (
                <div className="networthBarRow" key={label}>
                  <div>
                    <span>{label}</span>
                    <b>{money(value)}</b>
                  </div>
                  <div className="networthTrack debt">
                    <i
                      style={{
                        width: `${Math.min(100, Math.max(value ? 4 : 0, ratio * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBox>
      </div>
      <div className="networthDecisionGrid">
        <CardBox title="Lectura patrimonial">
          <div className="networthInsights">
            <div>
              <span>01</span>
              <div>
                <b>Tu mayor activo es {biggestAsset?.[0] || "ninguno"}</b>
                <p>
                  {biggestAsset
                    ? `${money(biggestAsset[1])} representa la mayor parte de tus activos registrados.`
                    : "Registra activos para construir una lectura patrimonial."}
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>Tu mayor pasivo es {biggestLiability?.[0] || "ninguno"}</b>
                <p>
                  {biggestLiability
                    ? `${money(biggestLiability[1])} concentra la mayor parte de tus obligaciones.`
                    : "No tienes pasivos registrados en esta vista."}
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>Las metas no se cuentan dos veces</b>
                <p>
                  Las metas son objetivos de asignación. El dinero sigue
                  formando parte de tus cuentas o efectivo, por lo que no se
                  suma nuevamente al patrimonio.
                </p>
              </div>
            </div>
          </div>
        </CardBox>
        <CardBox title="Siguiente decisión">
          <div className="networthAction">
            <strong>
              {liabilities > assets
                ? "Reducir pasivos prioritarios"
                : debtRatio > 60
                  ? "Bajar el nivel de deuda"
                  : cashAsset === 0
                    ? "Construir liquidez"
                    : "Proteger y hacer crecer el patrimonio"}
            </strong>
            <p>
              {liabilities > assets
                ? "Tu patrimonio neto es negativo. Enfoca primero los pagos que más presión generan."
                : debtRatio > 60
                  ? "Una parte importante de tus activos está comprometida por deuda. Evita aumentar obligaciones sin una razón clara."
                  : cashAsset === 0
                    ? "Crea una reserva líquida antes de asumir nuevas metas de largo plazo."
                    : "Mantén liquidez, controla deuda y sigue aumentando activos que realmente puedas conservar."}
            </p>
          </div>
        </CardBox>
      </div>
      <CardBox
        title="Inversiones y capital"
        action="Nueva inversión"
        onAction={() => open?.("investment")}
      >
        <div className="investmentSummary">
          {investments.length ? (
            investments.map((i) => {
              const ims = (investmentMovements || []).filter(
                (m) => m.investmentId === i.id && m.status !== "Anulado",
              );
              return (
                <div className="investmentRow investmentRowRich" key={i.id}>
                  <div>
                    <b>{i.name}</b>
                    <small>
                      {i.type} · {i.currency} · {ims.length} movimientos
                    </small>
                  </div>
                  <strong>{money(i.currentValue, i.currency)}</strong>
                  <span
                    className={
                      i.currentValue >= i.contributed ? "positive" : "negative"
                    }
                  >
                    {i.contributed > 0
                      ? `${i.currentValue >= i.contributed ? "+" : ""}${money(i.currentValue - i.contributed, i.currency)}`
                      : "—"}
                  </span>
                  <span className="actions">
                    <button onClick={() => open?.("investment-movement", i)}>
                      Registrar movimiento
                    </button>
                    <button onClick={() => open?.("investment", i)}>
                      Editar ficha
                    </button>
                    <button
                      className="dangerText"
                      onClick={() => removeInvestment?.(i.id)}
                    >
                      Eliminar
                    </button>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="investmentEmpty">
              <b>No hay inversiones registradas</b>
              <span>
                Crea una inversión y luego usa movimientos para registrar
                aportes, retiros y rendimientos.
              </span>
            </div>
          )}
        </div>
      </CardBox>
      <CardBox title="Historial de inversiones">
        <div className="investmentSummary">
          {(investmentMovements || [])
            .slice()
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 12)
            .map((m) => {
              const i = investments.find((x) => x.id === m.investmentId);
              return (
                <div className="investmentRow" key={String(m.id)}>
                  <div>
                    <b>{i?.name || "Inversión eliminada"}</b>
                    <small>
                      {m.date} · {m.type} · {m.status}
                    </small>
                  </div>
                  <strong
                    className={
                      m.type === "Rendimiento"
                        ? "positive"
                        : m.type === "Aporte"
                          ? "negative"
                          : "positive"
                    }
                  >
                    {m.type === "Aporte"
                      ? "−"
                      : m.type === "Retiro"
                        ? "+"
                        : "+"}
                    {money(m.amount, i?.currency || "PEN")}
                  </strong>
                  <span className="actions">
                    {m.status !== "Anulado" && (
                      <button
                        onClick={() => {
                          if (
                            confirm("¿Revertir este movimiento de inversión?")
                          )
                            reverseInvestment?.(m);
                        }}
                      >
                        Revertir
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          {!(investmentMovements || []).length && (
            <div className="investmentEmpty">
              <b>Sin movimientos</b>
              <span>Los aportes, retiros y rendimientos aparecerán aquí.</span>
            </div>
          )}
        </div>
      </CardBox>
      <CardBox
        title="Gastos recurrentes"
        action="Nuevo gasto"
        onAction={() => open?.("recurring")}
      >
        <div className="investmentSummary">
          {recurringExpenses.length ? (
            recurringExpenses.map((r) => (
              <div className="investmentRow" key={r.id}>
                <div>
                  <b>{r.name}</b>
                  <small>
                    {r.category} · {r.frequency} ·{" "}
                    {r.active ? "Activo" : "Pausado"}
                  </small>
                </div>
                <strong>{money(r.amount)}</strong>
                <span className="actions">
                  <button onClick={() => open?.("recurring", r)}>Editar</button>
                  <button
                    className="dangerText"
                    onClick={() => removeRecurring?.(r.id)}
                  >
                    Eliminar
                  </button>
                </span>
              </div>
            ))
          ) : (
            <div className="investmentEmpty">
              <b>No hay gastos recurrentes</b>
              <span>Registra pagos fijos para proyectar tu liquidez.</span>
            </div>
          )}
        </div>
      </CardBox>
      <CardBox title="Detalle patrimonial">
        <div className="networthTable">
          <div className="networthTHead">
            <span>Concepto</span>
            <span>Tipo</span>
            <span>Valor</span>
            <span>Peso</span>
          </div>
          {assetRows.map(([label, value]) => (
            <div className="networthTRow" key={"a" + label}>
              <span>
                <b>{label}</b>
              </span>
              <span>
                <Badge tone="green">Activo</Badge>
              </span>
              <strong>{money(value)}</strong>
              <span>{assets ? Math.round((value / assets) * 100) : 0}%</span>
            </div>
          ))}
          {liabilityRows.map(([label, value]) => (
            <div className="networthTRow" key={"l" + label}>
              <span>
                <b>{label}</b>
              </span>
              <span>
                <Badge tone="red">Pasivo</Badge>
              </span>
              <strong>{money(value)}</strong>
              <span>
                {liabilities ? Math.round((value / liabilities) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </CardBox>
      {investmentConfirm && (
        <ConfirmDialog
          title="¿Revertir este movimiento?"
          message="El movimiento pasará a estado anulado y el capital de la inversión se ajustará nuevamente. Esta acción conserva el historial y no se puede deshacer."
          summary={
            <>
              <span>
                {investmentConfirm.date} · {investmentConfirm.type}
              </span>
              <b>
                {money(
                  investmentConfirm.amount,
                  investments.find(
                    (i) => i.id === investmentConfirm.investmentId,
                  )?.currency || "PEN",
                )}
              </b>
            </>
          }
          confirmLabel="Revertir movimiento"
          onClose={() => setInvestmentConfirm(null)}
          onConfirm={() => {
            reverseInvestment?.(investmentConfirm);
            setInvestmentConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function CalendarPage({
  vehicles,
  maintenance,
  loans,
  debts,
  cards,
  documents,
  insurance,
  fines,
  recurringExpenses,
  accounts,
  openSource,
}: {
  vehicles: T.Vehicle[];
  maintenance: T.Maintenance[];
  loans: T.Loan[];
  debts: T.Debt[];
  cards: T.Card[];
  documents: T.VehicleDocument[];
  insurance: T.Insurance[];
  fines: T.Fine[];
  recurringExpenses?: T.RecurringExpense[];
  accounts?: T.FinancialAccount[];
  openSource?: (e: T.FinancialEvent) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthDays = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(monthDays).padStart(2, "0")}`;
  const engineEvents = financialEvents({
    debts,
    loans,
    cards,
    recurringExpenses: recurringExpenses || [],
    insurance,
    fines,
    maintenance,
    accounts,
    start: monthStart,
    days: monthDays,
  });
  const events: T.FinancialEvent[] = [
    ...engineEvents,
    ...vehicles.flatMap((v) =>
      documentsForVehicle(v.id, documents)
        .filter((d) => d.end && d.end >= monthStart && d.end <= monthEnd)
        .map((d) => ({
          id: `document-${d.id}`,
          date: d.end!,
          label: `Documento · ${v.plate} · ${d.type}`,
          amount: 0,
          direction: "NEUTRAL" as const,
          category: "Documentos",
          sourceType: "document" as T.SourceType,
          sourceId: d.id,
          status: (d.end! < today
            ? "Vencido"
            : "Programado") as T.FinancialEvent["status"],
        })),
    ),
  ];
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((e) => e.date.startsWith(monthPrefix));
  const currencies = Array.from(
    new Set(monthEvents.map((e) => e.currency || "PEN")),
  ) as T.Currency[];
  const totals = (currency: T.Currency) => ({
    incoming: monthEvents
      .filter((e) => (e.currency || "PEN") === currency && e.amount > 0)
      .reduce((a, e) => a + e.amount, 0),
    outgoing: monthEvents
      .filter((e) => (e.currency || "PEN") === currency && e.amount < 0)
      .reduce((a, e) => a + Math.abs(e.amount), 0),
  });
  const pen = totals("PEN"),
    usd = totals("USD");
  const visibleEvents = events
    .filter(
      (e) =>
        filter === "all" ||
        (filter === "in" ? e.direction === "IN" : e.direction === "OUT"),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const days = new Date(year, month + 1, 0).getDate(),
    first = new Date(year, month, 1).getDay();
  const cells = Array.from(
    { length: Math.ceil((first + days) / 7) * 7 },
    (_, i) => i - first + 1,
  );
  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));
  const monthName = cursor.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });
  const eventTone = (e: T.FinancialEvent) =>
    e.direction === "IN" ? "in" : e.direction === "OUT" ? "out" : "neutral";
  const eventMoney = (e: T.FinancialEvent) =>
    money(Math.abs(e.amount), e.currency || "PEN");
  return (
    <div className="calendarPage">
      <PageHead
        title="Calendario financiero"
        desc="Anticipa cobros, pagos, vencimientos y gastos programados en una sola vista."
      />
      <div className="calendarHero">
        <div>
          <small>AGENDA DEL MES</small>
          <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
          <p>
            {monthEvents.length} eventos ·{" "}
            {pen.incoming > 0 ? money(pen.incoming, "PEN") + " de cobros" : ""}
            {pen.incoming > 0 && pen.outgoing > 0 ? " · " : ""}
            {pen.outgoing > 0 ? money(pen.outgoing, "PEN") + " de salidas" : ""}
            {usd.incoming || usd.outgoing
              ? ` · USD ${money(usd.incoming, "USD")} cobros · ${money(usd.outgoing, "USD")} salidas`
              : ""}
          </p>
        </div>
        <div className="calendarHeroStats">
          <span>
            <b>{monthEvents.length}</b>eventos
          </span>
          <span>
            <b className="calendarIn">{money(pen.incoming, "PEN")}</b>cobros PEN
          </span>
          <span>
            <b className="calendarOut">{money(pen.outgoing, "PEN")}</b>salidas
            PEN
          </span>
        </div>
      </div>
      <div className="calendarLayout">
        <CardBox title={monthName}>
          <div className="calendarNav">
            <button onClick={() => move(-1)}>← Anterior</button>
            <button
              className="calendarToday"
              onClick={() =>
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
              }
            >
              Hoy
            </button>
            <button onClick={() => move(1)}>Siguiente →</button>
          </div>
          <div className="calendarGrid">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <b key={d}>{d}</b>
            ))}
            {cells.map((day) => {
              const date =
                day > 0 && day <= days
                  ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : "";
              const es = events.filter((e) => e.date === date);
              const isToday = date === today;
              return (
                <div
                  className={`calendarDay ${!date ? "muted" : ""} ${isToday ? "today" : ""}`}
                  key={`${year}-${month}-${day}`}
                >
                  {date && <span>{day}</span>}
                  <div className="calendarDots">
                    {es.slice(0, 3).map((e) => (
                      <i key={e.id} className={eventTone(e)} title={e.label} />
                    ))}
                  </div>
                  <div className="calendarDayEvents">
                    {es.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        className={eventTone(e)}
                        onClick={() => openSource?.(e)}
                        title="Abrir registro"
                      >
                        {e.label}
                      </button>
                    ))}
                    {es.length > 2 && <em>+{es.length - 2} más</em>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="calendarLegend">
            <span>
              <i className="in" />
              Cobros
            </span>
            <span>
              <i className="out" />
              Pagos / gastos
            </span>
            <span>
              <i className="neutral" />
              Vencimientos
            </span>
          </div>
        </CardBox>
        <CardBox
          title="Agenda"
          action={
            filter === "all" ? "Todos" : filter === "in" ? "Cobros" : "Salidas"
          }
        >
          <div className="calendarFilters">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Todos <span>{events.length}</span>
            </button>
            <button
              className={filter === "in" ? "active" : ""}
              onClick={() => setFilter("in")}
            >
              Cobros{" "}
              <span>{events.filter((e) => e.direction === "IN").length}</span>
            </button>
            <button
              className={filter === "out" ? "active" : ""}
              onClick={() => setFilter("out")}
            >
              Salidas{" "}
              <span>{events.filter((e) => e.direction === "OUT").length}</span>
            </button>
          </div>
          <div className="calendarAgenda">
            {visibleEvents.slice(0, 14).map((e) => (
              <button
                className="calendarEvent calendarEventButton"
                key={e.id}
                onClick={() => openSource?.(e)}
              >
                <div className="calendarEventDate">
                  <b>{new Date(e.date + "T12:00:00").getDate()}</b>
                  <small>
                    {new Date(e.date + "T12:00:00").toLocaleDateString(
                      "es-PE",
                      { month: "short" },
                    )}
                  </small>
                </div>
                <div className="calendarEventInfo">
                  <strong>{e.label}</strong>
                  <small>
                    {e.sourceType === "loan_payment"
                      ? "Cobro esperado"
                      : e.sourceType === "debt_payment"
                        ? "Compromiso financiero"
                        : e.sourceType === "maintenance"
                          ? "Costo de mantenimiento"
                          : e.sourceType === "insurance"
                            ? "Póliza / seguro"
                            : e.sourceType === "fine"
                              ? "Obligación pendiente"
                              : e.sourceType === "document"
                                ? "Documento"
                                : e.sourceType === "recurring"
                                  ? "Gasto recurrente"
                                  : "Vencimiento o fecha límite"}{" "}
                    · {e.status}
                  </small>
                </div>
                <b className={eventTone(e)}>
                  {e.amount === 0
                    ? "Fecha"
                    : `${e.direction === "IN" ? "+" : "−"}${eventMoney(e)}`}
                </b>
                <span aria-hidden="true">→</span>
              </button>
            ))}
            {!visibleEvents.length && (
              <div className="calendarEmpty">
                <b>Sin eventos</b>
                <span>No hay compromisos para este filtro.</span>
              </div>
            )}
          </div>
        </CardBox>
      </div>
      <div className="calendarDecisionGrid">
        <CardBox title="Lectura del calendario">
          <div className="calendarInsight">
            <span>01</span>
            <div>
              <b>
                {pen.outgoing > pen.incoming
                  ? "Las salidas PEN superan los cobros"
                  : "Tus cobros PEN cubren las salidas"}
              </b>
              <p>
                {pen.outgoing > pen.incoming
                  ? `Este mes tienes ${money(pen.outgoing - pen.incoming, "PEN")} más de salidas que de ingresos programados en PEN. Revisa liquidez antes de asumir nuevos compromisos.`
                  : `Los cobros programados cubren las salidas registradas en PEN. Mantén un margen para gastos que todavía no estén calendarizados.`}
              </p>
            </div>
          </div>
          <div className="calendarInsight">
            <span>02</span>
            <div>
              <b>
                {monthEvents.length
                  ? "No dejes que los vencimientos te sorprendan"
                  : "Aún no hay eventos registrados"}
              </b>
              <p>
                {monthEvents.length
                  ? "Ahora cada evento puede abrir su registro de origen. Revisa primero pagos con fecha cercana y obligaciones que puedan generar recargos."
                  : "Los eventos se alimentan de tus otros módulos. Registra obligaciones allí para que aparezcan automáticamente."}
              </p>
            </div>
          </div>
        </CardBox>
        <CardBox title="Cómo usarlo">
          <div className="calendarRule">
            <strong>Calendario = anticipación</strong>
            <p>
              No es otro lugar para registrar gastos. Su función es convertir
              fechas de deudas, tarjetas, seguros, documentos, mantenimiento y
              cobros en una agenda que te permita preparar liquidez con tiempo.
            </p>
            {currencies.includes("USD") && (
              <small>
                Los importes USD se muestran por separado para evitar mezclar
                monedas.
              </small>
            )}
          </div>
        </CardBox>
      </div>
    </div>
  );
}
function documentsForVehicle(id: string, documents: T.VehicleDocument[]) {
  return documents.filter((d) => d.vehicleId === id);
}
function insuranceForVehicle(id: string, insurance: T.Insurance[]) {
  return insurance.filter((i) => i.vehicleId === id);
}
function toDateForCard(payment: string, year: number, month: number) {
  const m = payment.match(/(\d{1,2})/);
  const day = Math.min(
    m ? Number(m[1]) : 12,
    new Date(year, month + 1, 0).getDate(),
  );
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function AlertsPage({
  vehicles,
  maintenance,
  loans,
  debts,
  cards,
  documents,
  insurance,
  fines,
  recurringExpenses,
  accounts,
  openSource,
}: {
  vehicles: T.Vehicle[];
  maintenance: T.Maintenance[];
  loans: T.Loan[];
  debts: T.Debt[];
  cards: T.Card[];
  documents: T.VehicleDocument[];
  insurance: T.Insurance[];
  fines: T.Fine[];
  recurringExpenses?: T.RecurringExpense[];
  accounts?: T.FinancialAccount[];
  openSource?: (e: T.FinancialEvent) => void;
}) {
  type AlertItem = {
    id: string;
    title: string;
    detail: string;
    kind: "critical" | "warning" | "info";
    group: string;
    date?: string;
    amount?: number;
    source: string;
    currency?: T.Currency;
    event?: T.FinancialEvent;
  };
  const horizon = financialEvents({
    debts,
    loans,
    cards,
    recurringExpenses: recurringExpenses || [],
    insurance,
    fines,
    maintenance,
    accounts,
    start: today,
    days: 30,
  });
  const engineAlerts: AlertItem[] = horizon.map((e) => ({
    id: e.id,
    title:
      e.status === "Vencido"
        ? "Compromiso vencido"
        : e.direction === "OUT"
          ? "Pago próximo"
          : "Cobro próximo",
    detail: e.label,
    kind: e.status === "Vencido" ? "critical" : "warning",
    group: e.category,
    date: e.date,
    amount: e.amount,
    source: e.sourceType,
    currency: e.currency,
    event: e,
  }));
  const alerts: AlertItem[] = [
    ...maintenance
      .filter(
        (m) =>
          m.status === "Vencido" &&
          !engineAlerts.some(
            (a) => a.id === `maintenance-${m.id}-${m.nextDate}`,
          ),
      )
      .map((m): AlertItem => ({
        id: `maint-${m.id}`,
        title: "Mantenimiento vencido",
        detail: `${vehicles.find((v) => v.id === m.vehicleId)?.model || "Vehículo"} · ${m.service}`,
        kind: "critical",
        group: "Vehículo",
        date: m.nextDate || today,
        amount: Number(m.partsCost || 0) + Number(m.laborCost || 0),
        source: "Mantenimiento",
        currency: undefined,
        event: {
          id: `maintenance-${m.id}`,
          date: m.nextDate || today,
          label: `Mantenimiento · ${m.service}`,
          amount: Number(m.partsCost || 0) + Number(m.laborCost || 0),
          direction: "OUT",
          category: "Vehículo",
          sourceType: "maintenance",
          sourceId: m.id,
          status: "Vencido",
        },
      })),
    ...documents
      .filter((d) => d.end && d.end < today)
      .map((d): AlertItem => ({
        id: `doc-${d.id}`,
        title: "Documento vencido",
        detail: `${d.type} · ${vehicles.find((v) => v.id === d.vehicleId)?.plate || "Vehículo"}`,
        kind: "critical",
        group: "Documentos",
        date: d.end,
        source: "Documentos",
        currency: undefined,
        event: {
          id: `document-${d.id}`,
          date: d.end!,
          label: `Documento · ${d.type}`,
          amount: 0,
          direction: "NEUTRAL",
          category: "Documentos",
          sourceType: "document",
          sourceId: d.id,
          status: "Vencido",
        },
      })),
    ...engineAlerts,
  ];
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");
  const [group, setGroup] = useState("all");
  const filtered = alerts.filter(
    (a) =>
      (filter === "all" || a.kind === filter) &&
      (group === "all" || a.group === group),
  );
  const critical = alerts.filter((a) => a.kind === "critical").length;
  const warning = alerts.filter((a) => a.kind === "warning").length;
  const groups = Array.from(new Set(alerts.map((a) => a.group)));
  const first = filtered[0];
  const reviewGroup = (g: string) => {
    setGroup(g);
    setFilter(criticalGroups.includes(g) ? "critical" : "all");
    requestAnimationFrame(() =>
      document
        .getElementById("alert-center")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const criticalGroups = Array.from(
    new Set(alerts.filter((a) => a.kind === "critical").map((a) => a.group)),
  );
  const titleFor = (kind: string) =>
    kind === "critical"
      ? "Atención inmediata"
      : kind === "warning"
        ? "Próximamente"
        : "Informativa";
  return (
    <div className="alertsPage">
      <PageHead
        title="Alertas"
        desc="Convierte vencimientos y compromisos en decisiones claras antes de que se conviertan en costos o problemas."
      />
      <div className="alertsHero">
        <div className="alertsHeroMain">
          <small>CENTRO DE ATENCIÓN</small>
          <h2>
            {critical
              ? `${critical} asunto${critical > 1 ? "s" : ""} requiere${critical > 1 ? "n" : ""} atención`
              : alerts.length
                ? "Todo bajo control"
                : "Sin alertas activas"}
          </h2>
          <p>
            {critical
              ? `Tienes ${critical} alerta${critical > 1 ? "s" : ""} crítica${critical > 1 ? "s" : ""} que conviene resolver primero.`
              : "No hay incidencias críticas derivadas de tus registros actuales."}
          </p>
          <div className="alertsHeroBar">
            <i
              style={{
                width: `${alerts.length ? Math.max(6, Math.min(100, (critical / alerts.length) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="alertsHeroSide">
          <span>PRIORIDAD ACTUAL</span>
          <strong>{critical ? "ALTA" : warning ? "MEDIA" : "BAJA"}</strong>
          <small>
            {critical
              ? `${criticalGroups.length} áreas necesitan revisión`
              : warning
                ? "Hay compromisos próximos"
                : "No hay pendientes detectados"}
          </small>
        </div>
      </div>
      <div className="stats">
        <Stat
          label="Alertas activas"
          value={String(alerts.length)}
          sub="Señales del sistema"
          tone={alerts.length ? "red" : "green"}
        />
        <Stat
          label="Atención inmediata"
          value={String(critical)}
          sub="Vencidas o en mora"
          tone={critical ? "red" : "green"}
        />
        <Stat
          label="Próximas"
          value={String(warning)}
          sub="Conviene anticiparlas"
          tone={warning ? "warn" : "green"}
        />
        <Stat
          label="Áreas afectadas"
          value={String(groups.length)}
          sub="Módulos con señales"
        />
      </div>
      <div className="alertsDecisionGrid">
        <CardBox title="Qué atender primero">
          <div className="alertPriorityList">
            {(criticalGroups.length ? criticalGroups : groups)
              .slice(0, 4)
              .map((g, i) => {
                const count =
                  alerts.filter((a) => a.group === g && a.kind === "critical")
                    .length || alerts.filter((a) => a.group === g).length;
                return (
                  <div key={g}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <b>{g}</b>
                      <small>
                        {count} señal{count === 1 ? "" : "es"} registrada
                        {count === 1 ? "" : "s"}
                      </small>
                    </div>
                    <button onClick={() => reviewGroup(g)}>
                      Revisar <span aria-hidden="true">→</span>
                    </button>
                  </div>
                );
              })}
            {!groups.length && (
              <div className="alertsEmptyMini">
                <b>No hay áreas pendientes</b>
                <span>
                  Las alertas aparecerán cuando otros módulos detecten una
                  situación que revisar.
                </span>
              </div>
            )}
          </div>
        </CardBox>
        <CardBox title="Lectura para decidir">
          <div className="alertInsights">
            <div>
              <span>01</span>
              <div>
                <b>
                  {critical
                    ? "Resuelve primero lo vencido"
                    : "Mantén la prevención"}
                </b>
                <p>
                  {critical
                    ? "Las alertas críticas pueden implicar recargos, interrupciones o pérdida de control. Atiéndelas antes que los recordatorios."
                    : "Tus registros no muestran incidencias críticas. Usa las próximas alertas para anticiparte."}
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>
                  {warning
                    ? "Prepara liquidez para los próximos pagos"
                    : "Sin pagos próximos destacados"}
                </b>
                <p>
                  {warning
                    ? "Las alertas preventivas no son problemas todavía: sirven para reservar dinero y evitar atrasos."
                    : "Cuando registres nuevas cuotas o pagos, aparecerán aquí como señales preventivas."}
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>Las alertas nacen de tus módulos</b>
                <p>
                  No necesitas registrar una alerta manualmente. Se generan a
                  partir de mantenimiento, documentos, seguros, multas y
                  crédito.
                </p>
              </div>
            </div>
          </div>
        </CardBox>
      </div>
      <div id="alert-center">
        <CardBox
          title="Centro de alertas"
          action={filter === "all" ? "Todas" : titleFor(filter)}
        >
          <div className="alertsToolbar">
            <div className="alertsFilters">
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                Todas <span>{alerts.length}</span>
              </button>
              <button
                className={filter === "critical" ? "active" : ""}
                onClick={() => setFilter("critical")}
              >
                Críticas <span>{critical}</span>
              </button>
              <button
                className={filter === "warning" ? "active" : ""}
                onClick={() => setFilter("warning")}
              >
                Próximas <span>{warning}</span>
              </button>
            </div>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">Todas las áreas</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="alertCenterList">
            {filtered.map((a) => (
              <div className="alertCenterRow" key={a.id}>
                <div className={`alertSignal ${a.kind}`}>
                  <b>
                    {a.kind === "critical"
                      ? "!"
                      : a.kind === "warning"
                        ? "•"
                        : "i"}
                  </b>
                </div>
                <div className="alertCenterInfo">
                  <div>
                    <strong>{a.title}</strong>
                    <Badge tone={a.kind === "critical" ? "red" : "warn"}>
                      {a.kind === "critical" ? "Crítica" : "Próxima"}
                    </Badge>
                  </div>
                  <p>{a.detail}</p>
                  <small>
                    {a.source}
                    {a.date ? ` · ${a.date}` : ""}
                  </small>
                </div>
                <div className="alertCenterAmount">
                  {a.amount && a.amount > 0 ? (
                    <b>{money(a.amount)}</b>
                  ) : (
                    <span>{a.date ? "Fecha registrada" : "Revisión"}</span>
                  )}
                </div>
                <button
                  className="alertDetailBtn"
                  onClick={() => (a.event ? openSource?.(a.event) : undefined)}
                >
                  Ver detalle <span>→</span>
                </button>
              </div>
            ))}
            {!filtered.length && (
              <div className="alertsEmpty">
                <div>✓</div>
                <b>No hay alertas en esta vista</b>
                <span>Prueba con otro filtro o área.</span>
              </div>
            )}
          </div>
        </CardBox>
      </div>
      {first && (
        <div className="alertsNext">
          <CardBox title="Siguiente acción">
            <div className="alertsNextInner">
              <div>
                <small>RECOMENDACIÓN</small>
                <strong>
                  {first.kind === "critical"
                    ? "Resolver la alerta prioritaria"
                    : "Preparar el próximo compromiso"}
                </strong>
                <p>
                  {first.title}: {first.detail}. Revisa el registro original y
                  actualiza su estado cuando la situación quede resuelta.
                </p>
              </div>
              <button
                onClick={() =>
                  first.event ? openSource?.(first.event) : undefined
                }
              >
                Abrir detalle →
              </button>
            </div>
          </CardBox>
        </div>
      )}
    </div>
  );
}

export default BudgetPage;
export { SavingsPage, NetWorth, CalendarPage, AlertsPage };
