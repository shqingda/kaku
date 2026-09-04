let returnTo: string | undefined;

export function rememberReturnTo(path: string | undefined) {
  returnTo = path && !/^\/account(?:[/?#]|$)/.test(path) ? path : undefined;
}

export function takeReturnTo() {
  const target = returnTo;
  returnTo = undefined;
  return target;
}
