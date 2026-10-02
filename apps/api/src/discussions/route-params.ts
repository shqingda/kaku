const GROUP_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function getGroupName(value: string | undefined) {
  return value && GROUP_NAME_PATTERN.test(value) ? value : null;
}

export function getPositiveId(value: string | undefined) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

