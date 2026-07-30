import { describe, it, expect } from "vitest";
import { GW, evalNum, evalStromkreis, risoMin, zsGrenzwert, gesamtStatus } from "../vde.js";

// ── evalNum ───────────────────────────────────────────────────────────────────
describe("evalNum", () => {
  it("gibt null für leere Werte zurück", () => {
    expect(evalNum("", v => v > 0)).toBeNull();
    expect(evalNum(null, v => v > 0)).toBeNull();
    expect(evalNum(undefined, v => v > 0)).toBeNull();
  });

  it("gibt null für nicht-numerische Eingaben zurück", () => {
    expect(evalNum("abc", v => v > 0)).toBeNull();
    expect(evalNum("--", v => v > 0)).toBeNull();
  });

  it("parst Komma als Dezimaltrennzeichen", () => {
    expect(evalNum("1,5", v => v >= 1.0)).toBe("ok");
    expect(evalNum("0,5", v => v >= 1.0)).toBe("fail");
  });

  it("bewertet Messwert korrekt", () => {
    expect(evalNum("2.0", v => v >= GW.riso_min)).toBe("ok");
    expect(evalNum("0.5", v => v >= GW.riso_min)).toBe("fail");
    expect(evalNum("1.0", v => v >= GW.riso_min)).toBe("ok"); // Grenzwert = ok
  });
});

// ── risoMin ───────────────────────────────────────────────────────────────────
describe("risoMin", () => {
  it("gibt den kleinsten Riso-Wert zurück", () => {
    const sk = { riso_l1_pe: "5,0", riso_l2_pe: "2,1", riso_l3_pe: "999", riso_n_pe: "" };
    expect(risoMin(sk)).toBe("2.10");
  });

  it("ignoriert leere Felder", () => {
    const sk = { riso_l1_pe: "", riso_l2_pe: "", riso_l3_pe: "3.5", riso_n_pe: "" };
    expect(risoMin(sk)).toBe("3.50");
  });

  it("gibt leeren String zurück wenn alle Felder leer", () => {
    const sk = { riso_l1_pe: "", riso_l2_pe: "", riso_l3_pe: "", riso_n_pe: "" };
    expect(risoMin(sk)).toBe("");
  });
});

// ── evalStromkreis ────────────────────────────────────────────────────────────
describe("evalStromkreis", () => {
  const skLeer = {
    pe_widerstand: "", riso_l1_pe: "", riso_l2_pe: "", riso_l3_pe: "", riso_n_pe: "",
    fi_vorhanden: false,
  };

  it("gibt 'offen' zurück wenn keine Messwerte vorhanden", () => {
    expect(evalStromkreis(skLeer)).toBe("offen");
  });

  it("gibt 'ok' zurück wenn Riso ≥ 1 MΩ", () => {
    const sk = { ...skLeer, riso_l1_pe: "1.0", riso_n_pe: "5.0" };
    expect(evalStromkreis(sk)).toBe("ok");
  });

  it("gibt 'fail' zurück wenn Riso < 1 MΩ", () => {
    const sk = { ...skLeer, riso_l1_pe: "0.8", riso_n_pe: "1.2" };
    expect(evalStromkreis(sk)).toBe("fail");
  });

  it("PE-Widerstand allein erzwingt kein fail (kein Grenzwert)", () => {
    const sk = { ...skLeer, pe_widerstand: "999" };
    expect(evalStromkreis(sk)).toBe("ok"); // PE = immer ok → count > 0 → nicht "offen"
  });

  describe("FI/RCD-Prüfung", () => {
    const skBase = { ...skLeer, fi_vorhanden: true, fi_typ: "AC", fi_t_halb: "" };

    it("FI Typ AC/A: t ≤ 300 ms → ok", () => {
      const sk = { ...skBase, fi_t_nenn: "250", fi_t_5fach: "", fi_ub: "" };
      expect(evalStromkreis(sk)).toBe("ok");
    });

    it("FI Typ AC/A: t > 300 ms → fail", () => {
      const sk = { ...skBase, fi_t_nenn: "350", fi_t_5fach: "", fi_ub: "" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("FI Typ S (selektiv): t ≤ 500 ms → ok", () => {
      const sk = { ...skBase, fi_typ: "S", fi_t_nenn: "450", fi_t_5fach: "", fi_ub: "" };
      expect(evalStromkreis(sk)).toBe("ok");
    });

    it("FI Typ S (selektiv): t > 500 ms → fail", () => {
      const sk = { ...skBase, fi_typ: "S", fi_t_nenn: "520", fi_t_5fach: "", fi_ub: "" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("5×IΔN: t ≤ 40 ms → ok", () => {
      const sk = { ...skBase, fi_t_nenn: "", fi_t_5fach: "35", fi_ub: "" };
      expect(evalStromkreis(sk)).toBe("ok");
    });

    it("5×IΔN: t > 40 ms → fail", () => {
      const sk = { ...skBase, fi_t_nenn: "", fi_t_5fach: "45", fi_ub: "" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("UB ≤ 50 V → ok", () => {
      const sk = { ...skBase, fi_t_nenn: "", fi_t_5fach: "", fi_ub: "25" };
      expect(evalStromkreis(sk)).toBe("ok");
    });

    it("UB > 50 V → fail", () => {
      const sk = { ...skBase, fi_t_nenn: "", fi_t_5fach: "", fi_ub: "55" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("½×IΔN Auslösung (Wert eingetragen) → fail", () => {
      const sk = { ...skBase, fi_t_nenn: "200", fi_t_5fach: "30", fi_ub: "25", fi_t_halb: "150" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("½×IΔN kein Auslösen (leer) → kein zusätzliches fail", () => {
      const sk = { ...skBase, fi_t_nenn: "200", fi_t_5fach: "30", fi_ub: "25", fi_t_halb: "" };
      expect(evalStromkreis(sk)).toBe("ok");
    });
  });

  describe("Schleifenimpedanz (Zs/Ik)", () => {
    it("zsGrenzwert für 16A/Typ B ist 2,875 Ω (U0=230V / Ia=5x16A)", () => {
      expect(zsGrenzwert({ sicherungstyp: "B", nennstrom: "16" })).toBeCloseTo(2.875, 3);
    });

    it("zsGrenzwert für 16A/Typ C ist 1,4375 Ω (Ia=10x16A)", () => {
      expect(zsGrenzwert({ sicherungstyp: "C", nennstrom: "16" })).toBeCloseTo(1.4375, 3);
    });

    it("zsGrenzwert ist null für Typ K/gG (kein fester Auslösefaktor)", () => {
      expect(zsGrenzwert({ sicherungstyp: "K", nennstrom: "16" })).toBeNull();
      expect(zsGrenzwert({ sicherungstyp: "gG", nennstrom: "16" })).toBeNull();
    });

    it("zsGrenzwert ist null ohne gültigen Nennstrom", () => {
      expect(zsGrenzwert({ sicherungstyp: "B", nennstrom: "" })).toBeNull();
      expect(zsGrenzwert({ sicherungstyp: "B", nennstrom: "abc" })).toBeNull();
    });

    it("Zs innerhalb Grenzwert → ok", () => {
      const sk = { ...skLeer, sicherungstyp: "B", nennstrom: "16", zs: "2.0", riso_l1_pe: "5" };
      expect(evalStromkreis(sk)).toBe("ok");
    });

    it("Zs über Grenzwert → fail (zu hohe Schleifenimpedanz, Abschaltbedingung nicht erfüllt)", () => {
      const sk = { ...skLeer, sicherungstyp: "B", nennstrom: "16", zs: "3.5", riso_l1_pe: "5" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("Ik unter Ia → fail (Kurzschlussstrom reicht nicht für sichere Abschaltung)", () => {
      const sk = { ...skLeer, sicherungstyp: "B", nennstrom: "16", ik: "50", riso_l1_pe: "5" };
      expect(evalStromkreis(sk)).toBe("fail");
    });

    it("Ik über Ia → ok", () => {
      const sk = { ...skLeer, sicherungstyp: "B", nennstrom: "16", ik: "100", riso_l1_pe: "5" };
      expect(evalStromkreis(sk)).toBe("ok");
    });

    it("ohne sicherungstyp/nennstrom bleibt Zs/Ik unbewertet (kein falscher ok/fail)", () => {
      const sk = { ...skLeer, zs: "5.0", riso_l1_pe: "5" };
      expect(evalStromkreis(sk)).toBe("ok");
    });
  });

  describe("½×IΔN Leerraum-Behandlung", () => {
    it("reines Leerzeichen in fi_t_halb löst KEIN fail aus (kein echter Messwert)", () => {
      const sk = { ...skLeer, fi_vorhanden: true, fi_typ: "AC", fi_t_nenn: "200", fi_t_5fach: "30", fi_ub: "25", fi_t_halb: "  " };
      expect(evalStromkreis(sk)).toBe("ok");
    });
  });

  describe("gesamtStatus", () => {
    it("gibt 'fail' zurück wenn mindestens ein Stromkreis fehlschlägt", () => {
      const ok = { ...skLeer, riso_l1_pe: "5" };
      const fail = { ...skLeer, riso_l1_pe: "0.5" };
      expect(gesamtStatus([ok, fail])).toBe("fail");
    });

    it("gibt 'offen' zurück wenn nicht alle Stromkreise gemessen sind (kein fail)", () => {
      const ok = { ...skLeer, riso_l1_pe: "5" };
      const offen = { ...skLeer };
      expect(gesamtStatus([ok, offen])).toBe("offen");
    });

    it("gibt 'ok' nur zurück wenn ALLE Stromkreise explizit ok sind", () => {
      const ok1 = { ...skLeer, riso_l1_pe: "5" };
      const ok2 = { ...skLeer, riso_l1_pe: "8" };
      expect(gesamtStatus([ok1, ok2])).toBe("ok");
    });

    it("gibt 'offen' zurück für eine leere Liste", () => {
      expect(gesamtStatus([])).toBe("offen");
    });
  });

  describe("Grenzwerte", () => {
    it("GW.riso_min ist 1.0 MΩ (VDE 0100-600 §61.3.3)", () => {
      expect(GW.riso_min).toBe(1.0);
    });
    it("GW.fi_t_nenn ist 300 ms", () => {
      expect(GW.fi_t_nenn).toBe(300);
    });
    it("GW.fi_t_s_nenn ist 500 ms (selektiver RCD)", () => {
      expect(GW.fi_t_s_nenn).toBe(500);
    });
    it("GW.fi_t_5fach ist 40 ms", () => {
      expect(GW.fi_t_5fach).toBe(40);
    });
    it("GW.fi_ub_max ist 50 V", () => {
      expect(GW.fi_ub_max).toBe(50);
    });
  });
});
