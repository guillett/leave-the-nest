export const getAccount = (fullname: string) => {
  const comps = fullname.split("@")
  if (!comps[0].length) {
    comps.shift()
  }
  return {
    user: comps?.[0],
    host: comps?.[1],
    acct: `${comps?.[0]}@${comps?.[1]}`,
  }
}
