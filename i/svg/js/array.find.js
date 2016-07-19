// Author Jordan Sitkin https://github.com/dustMason/Machine-Art

// if (Array.prototype.find) return;

var find = function(predicate) {
  var list = Object(this);
  var length = list.length >>> 0; // ES.ToUint32;
  if (length === 0) return undefined;
  if (typeof predicate !== 'function') {
    throw new TypeError('Array#find: predicate must be a function');
  }
  var thisArg = arguments[1];
  for (var i = 0, value; i < length && i in list; i++) {
    value = list[i];
    if (predicate.call(thisArg, value, i, list)) return value;
  }
  return undefined;
};

if (Object.defineProperty) {
  try {
    Object.defineProperty(Array.prototype, 'find', {
      value: find, configurable: true, enumerable: false, writable: true
    });
  } catch(e) {}
}

if (!Array.prototype.find) {
  Array.prototype.find = find;
}
