import { SAMPLE_COUNT } from "@/lib/design";

/** Decode audio and reduce it to SAMPLE_COUNT envelope samples in [0,1]. */
export async function samplesFromBlob(blob: Blob): Promise<number[]> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buf);
    return extractSamples(audio);
  } finally {
    ctx.close().catch(() => {});
  }
}

export function extractSamples(audio: AudioBuffer): number[] {
  const n = audio.length;
  const ch0 = audio.getChannelData(0);
  const ch1 = audio.numberOfChannels > 1 ? audio.getChannelData(1) : ch0;
  const out = new Array<number>(SAMPLE_COUNT).fill(0);
  const win = Math.max(1, Math.floor(n / SAMPLE_COUNT));
  for (let i = 0; i < n; i++) {
    const v = (Math.abs(ch0[i]) + Math.abs(ch1[i])) / 2;
    const b = Math.min(SAMPLE_COUNT - 1, Math.floor(i / win));
    if (v > out[b]) out[b] = v;
  }
  const peak = Math.max(...out, 0.01);
  const shaped = out.map((v) => Math.pow(v / peak, 0.78));
  return smooth(shaped, 2);
}

function smooth(samples: number[], radius: number): number[] {
  return samples.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = -radius; j <= radius; j++) {
      const k = i + j;
      if (k >= 0 && k < samples.length) {
        sum += samples[k];
        count++;
      }
    }
    return sum / count;
  });
}

/** Morse-code tone phrase for "LOVE" — a built-in demo for people without a mic. */
export async function demoSamples(): Promise<number[]> {
  const sr = 22050;
  const dot = 0.09;
  const freq = 523.25; // C5
  const letters: Record<string, string> = { L: ".-..", O: "---", V: "...-", E: "." };
  const word = "LOVE";
  const elements: { dur: number; gap: number }[] = [];
  for (const ch of word) {
    for (const sym of letters[ch]) {
      elements.push({ dur: sym === "." ? dot : dot * 3, gap: dot });
    }
    elements.push({ dur: 0, gap: dot * 2 }); // extra gap between letters
  }
  elements.push({ dur: 0, gap: dot });
  const total = elements.reduce((a, e) => a + e.dur + e.gap, 0);
  const ctx = new OfflineAudioContext(1, Math.ceil(sr * total), sr);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);
  let t = 0;
  for (const el of elements) {
    if (el.dur > 0) {
      const t0 = t;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.9, t0 + 0.012);
      gain.gain.setValueAtTime(0.9, t0 + el.dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, t0 + el.dur);
    }
    t += el.dur + el.gap;
  }
  osc.start(0);
  osc.stop(total);
  const rendered = await ctx.startRendering();
  return extractSamples(rendered);
}
