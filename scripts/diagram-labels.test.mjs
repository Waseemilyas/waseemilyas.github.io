import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/assets/css/styles.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.njk", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../src/_includes/partials/diagram-workflow.njk", import.meta.url), "utf8");
const caps = JSON.parse(readFileSync(new URL("../src/_data/capabilities.json", import.meta.url), "utf8"));

test("narrow frames swap scaled SVG labels for the same words at body size", () => {
  assert.match(css, /@container \(max-width: 36rem\)/);
  assert.match(css, /@container \(max-width: 28rem\)/);
  assert.match(css, /\.dnode \{[\s\S]*font-size: var\(--step-0\)/);
  assert.match(css, /\.cap-phone \.node \{[\s\S]*font-size: var\(--step-0\)/);
  assert.match(css, /\.node text \{ font-family: var\(--mono\); font-size: 11px/);
});

test("settled SVG label sizes are unchanged", () => {
  const care = readFileSync(new URL("../src/work/cs-care.md", import.meta.url), "utf8");
  const product = readFileSync(new URL("../src/work/cs-product.md", import.meta.url), "utf8");
  const auto = readFileSync(new URL("../src/work/cs-auto.md", import.meta.url), "utf8");
  for (const file of [care, product, auto, workflow]) {
    assert.match(file, /font-size="12"/);
  }
  assert.match(index, /class="cap-settled"/);
});

test("phone capability controls keep the authored keyboard contract", () => {
  assert.match(index, /class="cap-phone"/);
  assert.match(index, /class="cap-phone-hub">PRACTICE</);
  assert.match(index, /class="node" aria-describedby="capread" data-key="\{\{ n\.key \}\}"/);
  assert.match(index, /\{\{ n\.label \}\}<\/button>/);
  for (const node of caps.nodes) {
    assert.ok(node.key && node.label && node.title && node.body);
  }
});

test("case-study and workflow phone labels match the settled copy", () => {
  const cases = {
    "../src/work/cs-care.md": ["INTAKE", "SCHEDULING", "RECORDS", "AUTOMATION"],
    "../src/work/cs-product.md": ["INTERFACE", "LOGIC", "SHIPPED"],
    "../src/work/cs-auto.md": ["PROBLEM", "DATA", "SCOPE", "DESIGN", "SYSTEM"],
  };
  for (const [file, labels] of Object.entries(cases)) {
    const phone = readFileSync(new URL(file, import.meta.url), "utf8").split('class="diagram-phone"')[1];
    assert.ok(phone, file);
    for (const label of labels) assert.ok(phone.includes(`>${label}<`), `${file} ${label}`);
  }
  const phone = workflow.split('class="diagram-phone"')[1];
  for (const label of ["INPUT", "SCOPE", "DESIGN", "RUNNING SYSTEM"]) {
    assert.ok(phone.includes(`>${label}<`), label);
  }
});
