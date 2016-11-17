/**
 * Created by jonayet on 11/18/16.
 */
Error.stackTraceLimit = Infinity;

//require('../src/vendor');

var appContext = require.context('../src', true, /\.spec\.js/);
appContext.keys().forEach(appContext);