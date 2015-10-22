
export function path(obj, pth, value) {

}

export function forceString(val) {
  if (val === undefined || val === null) val = '';
  else if (typeof val === 'object') val = JSON.stringify(val);
  return val.toString();
}
