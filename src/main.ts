import seedrandom from "seedrandom";
import { Graphics } from "./helpers/graphics";
import { Helper } from "./helpers/helper";
import { Loader } from "./helpers/loader";
import { Interpreter } from "./interpreter";
import { RuleNode } from "./nodes";

const frame = (n = 0) =>
    new Promise((resolve) =>
        n ? setTimeout(resolve, n) : requestAnimationFrame(resolve)
    );

export const Main = async () => {
    const ep = await Loader.xml("resources/palette.xml");
    const ecolors = Helper.collectionToArr(ep.querySelectorAll("color"));
    const palette = new Map(
        ecolors.map((e) => [
            e.getAttribute("symbol").charAt(0),
            Helper.hex2rgba(e.getAttribute("value")),
        ])
    );

    const meta = seedrandom();
    const doc = await Loader.xml("models.xml");

    const qs = new URLSearchParams(location.search);
    const modelStr = qs.get("model") || "Growth";
    const speed = parseInt(qs.get("speed")) || 1;
    const delay = parseInt(qs.get("delay")) || 0;
    const overwriteSteps = parseInt(qs.get("steps")) || 0;

    for (const emodel of Helper.collectionIter(doc.querySelectorAll("model"))) {
        const name = emodel.getAttribute("name");
        const linearSize = parseInt(emodel.getAttribute("size")) || -1;
        const dimension = parseInt(emodel.getAttribute("d")) || 2;

        const MX = parseInt(emodel.getAttribute("length")) || linearSize;
        const MY = parseInt(emodel.getAttribute("width")) || linearSize;
        const MZ =
            parseInt(emodel.getAttribute("height")) ||
            (dimension === 2 ? 1 : linearSize);

        if (name !== modelStr) continue;

        const path = `models/${name}.xml`;
        const mdoc = await Loader.xml(path);
        if (!mdoc) {
            console.error(`Failed to load ${path}`);
            continue;
        } else console.log("Loading model...");

        const interpreter = await Interpreter.load(mdoc, MX, MY, MZ);
        if (!interpreter) {
            console.error(`Interpreter.load failed ${path}`);
            continue;
        } else console.log(`Model loaded: ${name}`);

        let amount = parseInt(emodel.getAttribute("amount")) || 2;
        const pixelsize = parseInt(emodel.getAttribute("pixelsize")) || 4;
        const seedString = emodel.getAttribute("seeds");
        const seeds = seedString?.split(" ").map((s) => parseInt(s));

        // const gif = emodel.getAttribute("gif") === "True";
        const gif = true;
        const iso = emodel.getAttribute("iso") === "True";
        const steps =
            overwriteSteps || parseInt(emodel.getAttribute("steps")) || 50000;

        // const gui = parseInt(emodel.getAttribute("gui")) || 0;
        const gui = true;

        let rendered = 0;

        if (gif) amount = 1;
        for (let k = 0; k < amount; k++) {
            const start = performance.now();
            const seed = seeds?.[k] || meta.int32();

            for (const [result, legend, FX, FY, FZ] of interpreter.run(
                seed,
                steps,
                gif
            )) {
                if (rendered++ % speed) continue;

                const colors = legend.split("").map((c) => palette.get(c));
                if (FZ === 1 || iso) {
                    await Graphics.renderBitmap(
                        result,
                        FX,
                        FY,
                        colors,
                        pixelsize
                        // interpreter.root.nodes[0] as RuleNode
                    );
                } else {
                    // TODO: save VOX / render
                }

                await frame(delay);
            }

            const [result, legend, FX, FY, FZ] = interpreter.final();
            const colors = legend.split("").map((c) => palette.get(c));
            if (FZ === 1) {
                await Graphics.renderBitmap(
                    result,
                    FX,
                    FY,
                    colors,
                    pixelsize
                    // interpreter.root.nodes[0] as RuleNode
                );
            } else {
            }

            const end = performance.now();
            console.log(
                `DONE (steps = ${rendered}, time = ${(end - start).toFixed(
                    2
                )}ms)`
            );
        }

        break; // LET'S JUST LOAD ONE
    }
};
