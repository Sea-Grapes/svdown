export const replaceStrSection = (
  str: string,
  start: number,
  end: number,
  insert: string
) => {
  return str.slice(0, start) + insert + str.slice(end)
}
