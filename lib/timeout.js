'use strict';

module.exports = function timeout (onTimeout, delay) {
  let timeout = setTimeout(onTimeout, delay);
  return {
    cancel: function cancel(){
      clearTimeout(timeout);
    },
    reset: function reset(){
      this.cancel();
      timeout = setTimeout(onTimeout, delay);
    }
  }
};
