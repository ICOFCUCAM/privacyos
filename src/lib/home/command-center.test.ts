import { describe, it, expect } from "vitest";
import { commandView, type CommandSignals } from "./command-center";

const signals = (over: Partial<CommandSignals> = {}): CommandSignals => ({
  protectionScore: 82,
  executiveRisk: 30,
  reputationRisk: 20,
  businessRisk: 25,
  activeThreats: 0,
  openCases: 1,
  removalsInFlight: 3,
  familyMembers: 4,
  employeesAtRisk: 2,
  vendorsAtRisk: 1,
  domainsAtRisk: 0,
  ...over,
});

describe("commandView", () => {
  it("reshapes the console per tier", () => {
    expect(commandView("personal", signals()).title).toBe("Protection Command");
    expect(commandView("professional", signals()).title).toBe("Reputation Command");
    expect(commandView("executive", signals()).title).toBe("Executive Command");
    expect(commandView("business", signals()).title).toBe("Organization Command");
  });

  it("leads business with org KPIs and points at Mission Control", () => {
    const v = commandView("business", signals({ employeesAtRisk: 5 }));
    expect(v.metrics.map((m) => m.label)).toEqual(["Org risk", "Employees at risk", "Vendors at risk", "Domains at risk"]);
    expect(v.metrics.find((m) => m.label === "Employees at risk")!.tone).toBe("bad"); // 5 > 3
    expect(v.focus.href).toBe("/dashboard/mission-control");
  });

  it("leads executive with the executive-risk index and links to ExecutiveOS", () => {
    const v = commandView("executive", signals({ executiveRisk: 80 }));
    expect(v.metrics[0]).toMatchObject({ label: "Executive risk", tone: "bad" });
    expect(v.focus.href).toBe("/dashboard/executive");
  });

  it("scores protection tone correctly for personal", () => {
    expect(commandView("personal", signals({ protectionScore: 90 })).metrics[0].tone).toBe("good");
    expect(commandView("personal", signals({ protectionScore: 40 })).metrics[0].tone).toBe("bad");
  });

  it("treats zero threats as good and many as bad", () => {
    expect(commandView("personal", signals({ activeThreats: 0 })).metrics[1].tone).toBe("good");
    expect(commandView("personal", signals({ activeThreats: 7 })).metrics[1].tone).toBe("bad");
  });
});
