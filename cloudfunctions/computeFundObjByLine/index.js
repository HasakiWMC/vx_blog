// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();

// 云函数入口函数
exports.main = async(event, context) => {

  const {
    name
  } = event;

  let {
    fundLine,
    funds,
    param,
    fundParam
  } = event;

  // if (!(funds && param && fundParam)) {
  //   let result = (await cloud.callFunction({
  //     name: 'constant'
  //   })).result;
  //   funds = result.funds;
  //   param = result.param;
  //   fundParam = result.fundParam;
  // }

  const fundObj = {
    name
  };

  const fundItem = funds.find(item => item.name === name);
  fundParam.forEach(fundParamItem => {
    if (fundParamItem === 'name') {
      const info = new RegExp(fundItem[fundParamItem]).exec(fundLine);
      console.log(info);
      fundLine = fundLine.slice(info.index + info[0].length);
    } else if (fundItem[fundParamItem]) {
      const info = new RegExp(param[fundParamItem].regex).exec(fundLine);
      console.log(info);
      fundObj[fundParamItem] = info[0];
      fundLine = fundLine.slice(info.index + info[0].length);
    }
  });

  return {
    fundObj
  };
}