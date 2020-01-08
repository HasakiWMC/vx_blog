//index.js
const app = getApp()

Page({
  data: {
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    logged: false,
    takeSession: false,
    requestResult: '',
    msg: '点击我',
    array: [1, 2, 3, 4, 5],
    view: 'MINA',
    staffA: {
      firstName: 'Hulk',
      lastName: 'Hu'
    },
    staffB: {
      firstName: 'Shang',
      lastName: 'You'
    },
    staffC: {
      firstName: 'Gideon',
      lastName: 'Lin'
    },
    buttonColor: 'green'
  },

  onLoad: function() {
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              this.setData({
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              })
            }
          })
        }
      }
    })
  },

  onGetUserInfo: function(e) {
    if (!this.data.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo
      })
    }
  },

  onGetOpenid: function() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        app.globalData.openid = res.result.openid
        wx.navigateTo({
          url: '../userConsole/userConsole',
        })
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        wx.navigateTo({
          url: '../deployFunctions/deployFunctions',
        })
      }
    })
  },

  // 上传图片
  doUpload: async function() {
    // 选择图片
    if (!app.globalData.fileCnt) {
      app.globalData.fileCnt = 1;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: function(res) {
        const filePath = res.tempFilePaths[0]
        console.log(filePath);
        app.globalData.filePath = filePath;
        wx.showLoading({
          title: '上传中',
        })
        const cloudPath = `tmp-image${app.globalData.fileCnt}` + filePath.match(/\.[^.]+?$/)[0];
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: res => {
            // get resource ID
            wx.hideLoading();
            wx.showLoading({
              title: '分析中',
            });
            wx.cloud.callFunction({
              // name: 'ocrMock', // 节省网络资源使用mock数据api
              name: 'ocr',
              data: {
                cloudPath,
                fileID: res.fileID
              }
            }).then(res => {
              wx.hideLoading();
              wx.showToast({
                title: '分析成功',
              });
              const {
                OCRdata,
                lackFunds
              } = res.result;
              console.log(lackFunds);
              app.globalData.OCRdata = OCRdata;
              app.globalData.lackFunds = lackFunds;
              wx.navigateTo({
                url: '../fundsList/fundsList',
              })
            }).catch(err => {
              wx.hideLoading();
              wx.showToast({
                title: '分析失败',
                icon: 'none'
              });
              console.log('云端错误:', err);
            }).finally(() => {
              wx.cloud.deleteFile({
                fileList: [res.fileID]
              });
              app.globalData.fileCnt += 1;
            });
          },
          fail: err => {
            wx.hideLoading();
            console.log('上传文件失败:', err);
          }
        });
      },
      fail: e => {
        console.error(e)
      }
    })
  },

  clickMe: function(event) {
    this.setData({
      msg: "Hello World"
    });
    console.log(event);
  }
})