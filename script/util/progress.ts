const BAR_WIDTH = 24;

export function createProgressBar(label: string, total: number) {
  const isTerminal = Boolean(process.stderr.isTTY);
  let lastPercent = -1;

  if (!isTerminal) console.log(`${label}...`);

  const update = (current: number) => {
    if (!isTerminal) return;

    const percent =
      total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 100;
    if (percent === lastPercent) return;
    lastPercent = percent;

    const filled = Math.floor((percent / 100) * BAR_WIDTH);
    const bar = "=".repeat(filled) + " ".repeat(BAR_WIDTH - filled);
    process.stderr.write(`\r${label} [${bar}] ${percent}%`);
  };

  return {
    update,
    complete() {
      update(total);
      if (isTerminal) process.stderr.write("\n");
      else console.log(`${label} complete.`);
    },
    fail() {
      if (isTerminal) process.stderr.write("\n");
      else console.log(`${label} failed.`);
    },
  };
}

export async function withSpinner<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  const isTerminal = Boolean(process.stderr.isTTY);
  const frames = ["|", "/", "-", "\\"];
  let frame = 0;

  if (!isTerminal) console.log(`${label}...`);
  const timer = isTerminal
    ? setInterval(() => {
        process.stderr.write(`\r${label} ${frames[frame++ % frames.length]}`);
      }, 120)
    : undefined;

  try {
    const result = await operation();
    if (timer) {
      clearInterval(timer);
      process.stderr.write(`\r${label} complete.\n`);
    } else {
      console.log(`${label} complete.`);
    }
    return result;
  } catch (error) {
    if (timer) {
      clearInterval(timer);
      process.stderr.write(`\r${label} failed.\n`);
    } else {
      console.log(`${label} failed.`);
    }
    throw error;
  }
}
