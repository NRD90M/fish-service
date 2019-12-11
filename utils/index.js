var BusinessError = require('./business-error'),
  request = require('request'),
  Stream = require('stream'),
  crypto = require('crypto'),
  Redis = require('./redis'),
  MysqlHelper = require('./mysql-helper'),
  SMS = require('./sms'),
  Safe = require('./safe'),
  weather = require('./weather');

/**
* 解析主题
* @param {String} topic 
*/
var parseTopic = function (topic) {
  var r = topic.split('/');
  return { product: r[2], clientId: r[3], type: r[1] };
};

/**
 * 生成验证码
 * @param {Number} radix 进制 默认10 
 * @param {Number} length 长度 默认6
 */
var generateValiCode = function (radix = 10, length = 6) {
  var result = [];
  for (let i = 0; i < length; i++) {
    result.push(Math.floor(Math.random() * radix).toString(radix));
  }
  return result.join('');
};

/**
 * 获取client IP
 * @param {HTTPRequest} req 
 */
var getClientIp = function (req) {
  var ip = req.headers['x-forwarded-for'] ||
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress || '';
  if (ip.split(',').length > 0) {
    ip = ip.split(',')[0]
  }
  return ip;
};

/**
 * 生成UUID
 */
function generateUUID() {
  var d = new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = ((d + Math.random() * 16) % 16) | 0;
    d = Math.floor(d / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}

/**
* 生成ID
*/
function generateID() {
  return generateUUID().replace(/\-/g, '');
}

/**
 * 生成TOKEN CODE
 */
var generateTokenCode = function () {
  return generateUUID().replace(/\-/g, '');
};

/**
 * sha256加密后的code,截取20位
 * @param {String} str 
 */
var getSha256CodeWith20 = function (str) {
  let hash = crypto.createHmac('sha256', '@#&*.sxx0)')
    .update(str)
    .digest('hex').substr(1, 20);
  return hash;
};

/**
 * 下载文件输出base64
 * @param {String} url 
 * @param {Function} cb 
 */
var downloadFileWithBase64 = function (url, cb) {
  let list = [];
  let SW = Stream.Writable();
  SW._write = function (chunk, enc, next) {
    list.push(chunk);
    next();
  };
  request(url).pipe(SW).on('finish', (err) => {
    if (err) {
      console.error(err);
      return cb(err);
    }
    let result = Buffer.concat(list);
    cb(undefined, result.toString('base64'));
  });
};

/**
 * 时间格式化
 * @param {Date} date 
 * @param {String} fmt 
 */
function dateFormat(date, fmt) {
  var o = {
    "M+": date.getMonth() + 1, //月份 
    "d+": date.getDate(), //日 
    "h+": date.getHours(), //小时 
    "m+": date.getMinutes(), //分 
    "s+": date.getSeconds(), //秒 
    "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
    "S": date.getMilliseconds() //毫秒 
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

/**
 * 按照UTC时间格式化
 * @param {Date} date 
 * @param {String} fmt 
 */
function dateFormatWithUTC(date, fmt) {
  var o = {
    "M+": date.getUTCMonth() + 1, //月份 
    "d+": date.getUTCDate(), //日 
    "h+": date.getUTCHours(), //小时 
    "m+": date.getUTCMinutes(), //分 
    "s+": date.getUTCSeconds(), //秒 
    "q+": Math.floor((date.getUTCMonth() + 3) / 3), //季度 
    "S": date.getUTCMilliseconds() //毫秒 
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getUTCFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

/**
 * 补位字符方法
 * @param {Number} num 数字
 * @param {Number} n 长度
 * @param {String} char 补位的字符,默认'0'
 */
function PrefixInteger(num, n, char = '0') {
  return (Array(n).join(char) + num).slice(-n);
}

/**
 * 检查必填参数
 * @param {Array} fields
 * @param {Object} params 
 * @returns {Boolean} 通过true，不过通过false
 */
function checkRequiredParams(fields, params) {
  for (let i in fields) {
    let field = fields[i];
    if (params[field] === undefined) {
      return false;
    }
  }
  return true;
}
/**
 * 设备状态数据io状态转换为数组
 * @param {Object} params 
 */
function statusDataChangeArray(params) {
  // console.log('statusDataChangeArray', params);
  if (!params) { return params; }
  let orgStatus = params.status,
    result = { online: params.online, water_temperature: orgStatus.water_temperature, ph: orgStatus.ph, o2: orgStatus.o2, status: [] },
    status = result.status;
  for (const key in orgStatus) {
    if (orgStatus.hasOwnProperty(key)) {
      let element = orgStatus[key];
      if (element != null && typeof element === 'object') {
        status.push({
          code: key,
          opened: element.opened,
          start_time: element.start_time,
          duration: element.duration
        });
      }
    }
  }
  return result;
}
module.exports = { checkRequiredParams, parseTopic, BusinessError, Redis, MysqlHelper, generateValiCode, getClientIp, generateTokenCode, getSha256CodeWith20, generateUUID, generateID, downloadFileWithBase64, dateFormat, dateFormatWithUTC, PrefixInteger, SMS, Safe, statusDataChangeArray, weather };
