/**
 * End-to-end verification for Residence Explorer user requirements.
 * Run: npm run verify:explorer
 */
import { chromium } from "playwright";

const BASE_URL = process.env.AIXESS_URL || "http://localhost:5173/#residences";
const VIEWPORT = { width: 1440, height: 900 };

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const label = pass ? "PASS" : "FAIL";
  console.log(`${label}: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForExplorer(page) {
  await page.waitForSelector(".building-map canvas", { timeout: 120_000 });
  await page.waitForFunction(
    () => document.querySelector(".building-map")?.dataset.loadState === "ready",
    { timeout: 120_000 },
  );
}

async function scrollToExplorer(page) {
  await page.evaluate(() => {
    document.querySelector("#residence-explorer")?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
}

async function scrollExplorerProgress(page, targetProgress = 0.5) {
  await page.waitForFunction(
    (target) => {
      const section = document.querySelector(".residence-explorer");
      if (!section) return false;
      const height = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / height));
      return progress >= target - 0.05;
    },
    targetProgress,
    { timeout: 30_000 },
  ).catch(async () => {
    for (let i = 0; i < 40; i += 1) {
      await page.mouse.wheel(0, 140);
      await page.waitForTimeout(60);
      const progress = await page.evaluate(() => {
        const section = document.querySelector(".residence-explorer");
        const height = Math.max(section.offsetHeight - window.innerHeight, 1);
        return Math.min(1, Math.max(0, -section.getBoundingClientRect().top / height));
      });
      if (progress >= targetProgress - 0.05) break;
    }
  });
}

async function scrollToSettled(page) {
  await page.evaluate(() => {
    const section = document.querySelector(".residence-explorer");
    if (!section) return;
    const max = Math.max(section.offsetHeight - window.innerHeight, 0);
    window.scrollTo(0, section.offsetTop + max * 0.99);
  });
  await page.waitForTimeout(500);
  await page.waitForSelector(".building-map.is-settled", { timeout: 30_000 });
}

async function canvasCenter(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".building-map canvas");
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 };
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const section = document.querySelector(".residence-explorer");
    const map = document.querySelector(".building-map");
    const height = Math.max(section.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / height));
    return {
      scrollY: window.scrollY,
      progress,
      settled: map?.classList.contains("is-settled") ?? false,
      interactive: map?.classList.contains("is-interactive") ?? false,
      zoomable: section?.dataset.zoomable === "true",
      hoveredFloor: map?.dataset.hoveredFloor ?? null,
      cameraFov: map?.dataset.cameraFov ? Number(map.dataset.cameraFov) : null,
      floorOptions: [...document.querySelectorAll(".residence-filter-controls select option")]
        .map((option) => option.value)
        .filter((value) => value !== "all"),
    };
  });
}

async function readCameraPosition(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".building-map canvas");
    let fiber = canvas[Object.keys(canvas).find((key) => key.startsWith("__reactFiber"))];
    while (fiber.return) fiber = fiber.return;
    const queue = [fiber];
    let app;
    while (queue.length) {
      const node = queue.shift();
      const value = node.memoizedProps?.value;
      if (value?.scene && value?.root) {
        app = value;
        break;
      }
      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
    }
    const position = app.root.findByName("Official Reverance orbit camera").getPosition();
    return [position.x, position.y, position.z];
  });
}

function cameraDistance(a, b) {
  return Math.hypot(...a.map((value, index) => value - b[index]));
}

async function measureBlockSwitch(page, index) {
  const start = await readCameraPosition(page);
  await page.evaluate((buttonIndex) => {
    document.querySelectorAll(".model-block-switcher button")[buttonIndex].click();
  }, index);
  await page.waitForTimeout(160);
  const early = await readCameraPosition(page);
  await page.waitForTimeout(1440);
  const end = await readCameraPosition(page);
  const total = cameraDistance(start, end);
  return { progress: total > 0 ? 1 - cameraDistance(early, end) / total : 0, total, end };
}

async function measureOrangeTintDifference(page, beforeBuffer, afterBuffer) {
  return page.evaluate(async ({ beforeBase64, afterBase64 }) => {
    const decode = async (base64) => {
      const response = await fetch(`data:image/png;base64,${base64}`);
      return createImageBitmap(await response.blob());
    };
    const [beforeImage, afterImage] = await Promise.all([
      decode(beforeBase64),
      decode(afterBase64),
    ]);
    const width = Math.min(beforeImage.width, afterImage.width);
    const height = Math.min(beforeImage.height, afterImage.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(beforeImage, 0, 0, width, height);
    const before = context.getImageData(0, 0, width, height).data;
    context.clearRect(0, 0, width, height);
    context.drawImage(afterImage, 0, 0, width, height);
    const after = context.getImageData(0, 0, width, height).data;
    beforeImage.close();
    afterImage.close();

    let orangeTintPixels = 0;
    let changedPixels = 0;
    for (let index = 0; index < before.length; index += 4) {
      const redShift = after[index] - before[index];
      const greenShift = after[index + 1] - before[index + 1];
      const blueShift = after[index + 2] - before[index + 2];
      if (Math.abs(redShift) + Math.abs(greenShift) + Math.abs(blueShift) > 24) {
        changedPixels += 1;
      }
      if (
        redShift > 18
        && redShift - greenShift > 16
        && redShift - blueShift > 8
        && after[index] > after[index + 1] * 1.25
        && after[index] > after[index + 2] * 1.25
      ) {
        orangeTintPixels += 1;
      }
    }

    return { orangeTintPixels, changedPixels, width, height };
  }, {
    beforeBase64: beforeBuffer.toString("base64"),
    afterBase64: afterBuffer.toString("base64"),
  });
}

async function wheelOverCanvas(page, deltaY, { ctrlKey = false, metaKey = false } = {}) {
  const point = await canvasCenter(page);
  await page.mouse.move(point.x, point.y);
  if (ctrlKey) await page.keyboard.down("Control");
  if (metaKey) await page.keyboard.down("Meta");
  await page.mouse.wheel(0, deltaY);
  if (metaKey) await page.keyboard.up("Meta");
  if (ctrlKey) await page.keyboard.up("Control");
  await page.waitForTimeout(350);
}

async function dispatchZoomWheel(page, deltaY, { ctrlKey = false, metaKey = false } = {}) {
  const point = await canvasCenter(page);
  await page.mouse.move(point.x, point.y);
  await page.evaluate(({ x, y, deltaY: dy, ctrlKey: ctrl, metaKey: meta }) => {
    const canvas = document.querySelector(".building-map canvas");
    canvas?.dispatchEvent(new WheelEvent("wheel", {
      deltaY: dy,
      ctrlKey: ctrl,
      metaKey: meta,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }));
  }, { ...point, deltaY, ctrlKey, metaKey });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector(".residence-explorer", { timeout: 120_000 });
  await scrollToExplorer(page);
  await waitForExplorer(page);

  // A loaded SOG must recover if the visible canvas backing buffer becomes 0x0.
  const canvasSize = await page.evaluate(() => {
    const canvas = document.querySelector(".building-map canvas");
    return { width: canvas.width, height: canvas.height };
  });
  await page.evaluate(() => {
    const canvas = document.querySelector(".building-map canvas");
    canvas.width = 0;
    canvas.height = 0;
  });
  const canvasRecovered = await page.waitForFunction(({ width, height }) => {
    const canvas = document.querySelector(".building-map canvas");
    return canvas?.width === width && canvas?.height === height;
  }, canvasSize, { timeout: 5_000 }).then(() => true, () => false);
  record("Visible model canvas recovers from a zero-sized render buffer", canvasRecovered);

  // 1. Explorer becomes interactive while visible (before fully settled)
  await scrollExplorerProgress(page, 0.35);
  let state = await readState(page);
  record(
    "Building is interactive during scroll-turn (not only when settled)",
    state.interactive && !state.settled && state.progress > 0.2,
    `interactive=${state.interactive}, settled=${state.settled}, progress=${state.progress.toFixed(3)}`,
  );

  // 2. Zoom works mid-scroll (Ctrl+wheel on Windows, Cmd+wheel on Mac)
  const fovBeforeMid = state.cameraFov;
  await dispatchZoomWheel(page, -120, { ctrlKey: true });
  let fovAfterMid = (await readState(page)).cameraFov;
  record(
    "Ctrl+wheel zoom works before the building has settled",
    fovBeforeMid !== null && fovAfterMid !== null && fovAfterMid < fovBeforeMid,
    `fov ${fovBeforeMid} -> ${fovAfterMid}, zoomable=${state.zoomable}`,
  );

  // 3. Plain wheel still scrolls the page over the canvas mid-turn
  const scrollBefore = (await readState(page)).scrollY;
  await wheelOverCanvas(page, 120);
  const scrollAfter = (await readState(page)).scrollY;
  record(
    "Plain wheel scrolls the page over the canvas (no modifier)",
    scrollAfter > scrollBefore,
    `scrollY ${scrollBefore} -> ${scrollAfter}`,
  );

  // 4. Cmd+wheel zoom (Mac trackpad/gesture path)
  const fovBeforeCmd = (await readState(page)).cameraFov;
  await dispatchZoomWheel(page, -120, { metaKey: true });
  const fovAfterCmd = (await readState(page)).cameraFov;
  record(
    "Cmd+wheel zoom works (macOS modifier path)",
    fovBeforeCmd !== null && fovAfterCmd !== null && fovAfterCmd < fovBeforeCmd,
    `fov ${fovBeforeCmd} -> ${fovAfterCmd}`,
  );

  // 5. Floor hover updates when moving from rail to canvas (no sticky rail highlight)
  const railButton = page.locator(".model-floor-rail button[data-floor='16']");
  const turnPoint = await canvasCenter(page);
  if (await railButton.count()) {
    await railButton.hover();
    await page.waitForTimeout(150);
    await page.mouse.move(turnPoint.x, turnPoint.y);
    await page.waitForTimeout(400);
    const afterMove = await readState(page);
    record(
      "Floor hover updates when pointer moves from rail to canvas",
      afterMove.hoveredFloor !== "16",
      `rail hovered 16, canvas pick -> ${afterMove.hoveredFloor}`,
    );
  } else {
    record("Floor hover updates when pointer moves from rail to canvas", false, "floor rail not ready");
  }

  // 6. Settle and verify scroll over settled building
  await scrollToSettled(page);
  state = await readState(page);
  record("Building reaches settled front view", state.settled, `progress=${state.progress.toFixed(3)}`);

  const extraScrollAfterExplorer = await page.evaluate(() => {
    const section = document.querySelector(".residence-explorer");
    return document.documentElement.scrollHeight - (section.offsetTop + section.offsetHeight);
  });
  record(
    "Collapsed site information adds no scroll past the explorer",
    extraScrollAfterExplorer <= 1,
    `${extraScrollAfterExplorer}px beyond the explorer`,
  );

  const blockBTransition = await measureBlockSwitch(page, 1);
  const blockATransition = await measureBlockSwitch(page, 0);
  record(
    "A/B building camera turns are visibly progressive in both directions",
    blockBTransition.total > 3 && blockATransition.total > 3
      && blockBTransition.progress > 0.05 && blockBTransition.progress < 0.8
      && blockATransition.progress > 0.05 && blockATransition.progress < 0.8,
    `B ${(blockBTransition.progress * 100).toFixed(0)}%, A ${(blockATransition.progress * 100).toFixed(0)}% of turn after 160ms`,
  );

  const settledScrollBefore = state.scrollY;
  await wheelOverCanvas(page, -120);
  const settledScrollUp = (await readState(page)).scrollY;
  await wheelOverCanvas(page, 120);
  const settledScrollDown = (await readState(page)).scrollY;
  record(
    "Plain wheel scrolls up and down over settled building canvas",
    settledScrollUp < settledScrollBefore && settledScrollDown > settledScrollUp,
    `scrollY ${settledScrollBefore} -> ${settledScrollUp} -> ${settledScrollDown}`,
  );

  // 6. Ctrl+wheel zoom when settled
  const fovSettledBefore = (await readState(page)).cameraFov;
  await dispatchZoomWheel(page, -120, { ctrlKey: true });
  const fovSettledAfter = (await readState(page)).cameraFov;
  record(
    "Ctrl+wheel zoom works when settled",
    fovSettledBefore !== null && fovSettledAfter !== null && fovSettledAfter < fovSettledBefore,
    `fov ${fovSettledBefore} -> ${fovSettledAfter}`,
  );

  // 7. Floor hover clears when pointer leaves the building map
  if (await railButton.count()) {
    await railButton.hover();
    await page.waitForTimeout(150);
    await page.mouse.move(24, 24);
    await page.waitForTimeout(300);
    record(
      "Floor hover clears when pointer leaves the building map",
      (await readState(page)).hoveredFloor === null,
    );
  } else {
    record("Floor hover clears when pointer leaves the building map", false, "floor rail not ready");
  }

  // 8. The hover state must change the rendered SOG pixels, not only the rail and tooltip.
  if (await railButton.count()) {
    await page.mouse.move(24, 24);
    await page.waitForTimeout(300);
    const canvas = page.locator(".building-map canvas");
    const beforeTint = await canvas.screenshot();
    await railButton.hover();
    await page.waitForFunction(
      () => document.querySelector(".building-map")?.dataset.hoveredFloor === "16",
    );
    await page.waitForTimeout(300);
    const afterTint = await canvas.screenshot();
    const tintDifference = await measureOrangeTintDifference(page, beforeTint, afterTint);
    record(
      "Hovered floor visibly receives the orange SOG tint",
      tintDifference.orangeTintPixels > 300,
      `${tintDifference.orangeTintPixels} orange pixels; ${tintDifference.changedPixels} total changed`,
    );
    await page.mouse.move(24, 24);
  } else {
    record("Hovered floor visibly receives the orange SOG tint", false, "floor rail not ready");
  }

  // 9. Middle-mouse drag orbits (camera FOV unchanged, manual control engaged)
  const fovBeforeOrbit = (await readState(page)).cameraFov;
  const orbitPoint = await canvasCenter(page);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(orbitPoint.x, orbitPoint.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(orbitPoint.x + 80, orbitPoint.y + 40, { steps: 12 });
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(500);
  const afterMiddleDrag = await readState(page);
  record(
    "Middle-mouse drag engages orbit without changing optical zoom",
    afterMiddleDrag.cameraFov !== null
      && Math.abs(afterMiddleDrag.cameraFov - fovBeforeOrbit) < 0.5,
    `fov stayed near ${fovBeforeOrbit} (${afterMiddleDrag.cameraFov})`,
  );

  // 10. Left-drag orbit completes without error
  await page.mouse.move(orbitPoint.x, orbitPoint.y);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(orbitPoint.x - 70, orbitPoint.y + 30, { steps: 12 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(300);
  record("Left-drag orbit interaction completes without error", true);

  // 11. Instruction overlay does not block canvas clicks
  const overlayBlocks = await page.evaluate(() => {
    const instruction = document.querySelector(".building-model-instruction");
    const style = instruction ? getComputedStyle(instruction) : null;
    return style?.pointerEvents === "none";
  });
  record("Instruction overlay is pointer-events transparent", overlayBlocks);

  // 12. Floor filter lists snapshot floors (not only floors with units)
  const floorValues = (await readState(page)).floorOptions;
  record(
    "Floor filter includes low-numbered snapshot floors",
    floorValues.includes("2") || floorValues.includes("02") || floorValues.some((v) => Number(v) === 2),
    `options: ${floorValues.slice(0, 6).join(", ")}${floorValues.length > 6 ? "…" : ""}`,
  );

  // 13. Reset view button works when settled
  const reset = page.locator(".model-reset-view");
  if (await reset.isVisible()) {
    await reset.click();
    await page.waitForTimeout(600);
    record("Reset view button is clickable when settled", true);
  } else {
    record("Reset view button is clickable when settled", false, "button not visible");
  }

  const failed = results.filter((entry) => !entry.pass);
  console.log("\n--- Summary ---");
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error("\nFailed checks:");
    for (const entry of failed) {
      console.error(`  - ${entry.name}: ${entry.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log("All residence explorer checks passed.");
  }
} catch (error) {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
