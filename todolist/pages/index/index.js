//index.js
const app = getApp()

Page({
  data: {
    openid: '',
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    logged: true,
    takeSession: false,
    requestResult: '',
    inputValue: '',
    disabledAddBtn: true,
    items: [],
    itemsUnfinished: [],
    unfinishedCount: '',
    filterItems: [],
    filter: 'all',
  },

  onLoad: function() {
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }

    if (app.globalData.openid) {
      this.setData({
        openid: app.globalData.openid
      })
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
                userInfo: res.userInfo,
                logged: true
              })
            }
          })
        } else {
          this.setData({
            logged: false
          })
        }

        this.dbOnGetOpenid();
      }
    })
  },

  dbOnGetOpenid: function() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid);
        this.setData({
          openid: res.result.openid
        });
        this.dbOnQuery();
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    })
  },

  dbOnQuery: function() {
    const db = wx.cloud.database()
    // 查询当前用户所有的 counters
    db.collection('counters').where({
      _openid: this.data.openid
    }).get({
      success: res => {
        let getItems = [];
        let unfinishedCount = 0;
        let {filterItems} = this.data;

        getItems = res.data.map(item => {
          if(!item.item.finished) {
            unfinishedCount++;
          }
          item.item.id = item._id;
          filterItems.push(item.item);
          return item.item;
        });

        this.setData({
          items: getItems,
          unfinishedCount: unfinishedCount,
          filterItems
        })
        console.log('[数据库] [查询记录] 成功: ', getItems);
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '查询记录失败'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      }
    })
  },

  onGetUserInfo: function(e) {
    if (!this.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo
      })
    }
  },

  onGetInput: function(e) {
    if (!e.detail.value)
      return;

    this.setData({
      inputValue: e.detail.value,
      disabledAddBtn: false
    })
  },

  onAddItem: function(e) {
    let item = {
      logDate: new Date().getTime(),
      description: this.data.inputValue,
      finished: false,
    };

    this.dbOnAdd(item);
  },

  dbOnAdd: function (item) {
    const db = wx.cloud.database();
    let {items, filterItems, unfinishedCount, inputValue} = this.data;

    db.collection('counters').add({
      data: {
        item
      },

      success: res => {
      
        this.setData({
          count: 1
        });
        item.id = res._id;
        console.log('数据库'+item.id);
        items.push(item);
        filterItems.push(item);

        this.setData({
          items: items,
          filterItems,
          unfinishedCount: unfinishedCount + 1,
          inputValue: null,
          disabledAddBtn: true
        });

        wx.showToast({
          title: '新增记录成功',
        })
        console.log('[数据库] [新增记录] 成功，记录 _id: ', res._id)
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '服务器开小差了, 请联系管理员'
        })
        console.error('[数据库] [新增记录] 失败：', err)
      }
    })
  },

  onItemToggle: function(e) {
    const { itemId } = e.currentTarget.dataset;
    let { items, unfinishedCount, filter} = this.data;

    items = items.map(item => {
      if (itemId === item.id) {
        item.finished = !item.finished;
        item.finished ? unfinishedCount-- : unfinishedCount++ ;
      }
      return item;
    });

    const filterItems = this.todoFilter(filter, items);

    this.setData({
      items,
      unfinishedCount,
      filterItems
    });
  },

  onItemDel: function(e) {
    const {itemId} = e.currentTarget.dataset;
    
    this.dbOnDel(itemId);
  },

  dbOnDel: function(itemId) {
    if (itemId) {
      const db = wx.cloud.database()
      db.collection('counters').doc(itemId).remove({
        success: res => {
          let { items, unfinishedCount, filter, filterItems} = this.data;

          unfinishedCount--;

          wx.showToast({
            title: '删除成功',
          });

          items = items.filter(item => {
            return item.id !== itemId;
          });

          this.setData({
            items,
            unfinishedCount,
            filterItems: this.todoFilter(filter, todos)
          });
        },
        fail: err => {
          wx.showToast({
            icon: 'none',
            title: '删除失败, 请联系管理员',
          })
          console.error('[数据库] [删除记录] 失败：', err)
        }
      })
    } else {
      wx.showToast({
        title: '无记录可删，请见创建一个记录',
      })
    }
  },

  useFilter(e) {
    const { filter } = e.currentTarget.dataset;
    const { items } = this.data;
    const filterItems = this.todoFilter(filter, items);
    this.setData({
      filter,
      filterItems,
    });
  },

  todoFilter(filter, items) {
    console.log(filter);
    return filter === 'all' ? items : items.filter(x => x.finished === (filter !== 'unfinished'));
  },

  clearCompleted() {
    const { filter } = this.data;
    let { items } = this.data;
    items = items.filter(x => !x.completed);
    this.setData({
      items,
      filterItems: this.todoFilter(filter, items),
    });
  },
  






  /////////////////////////////////////////////////////////

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
  doUpload: function () {
    // 选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {

        wx.showLoading({
          title: '上传中',
        })

        const filePath = res.tempFilePaths[0]
        
        // 上传图片
        const cloudPath = 'my-image' + filePath.match(/\.[^.]+?$/)[0]
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: res => {
            console.log('[上传文件] 成功：', res)

            app.globalData.fileID = res.fileID
            app.globalData.cloudPath = cloudPath
            app.globalData.imagePath = filePath
            
            wx.navigateTo({
              url: '../storageConsole/storageConsole'
            })
          },
          fail: e => {
            console.error('[上传文件] 失败：', e)
            wx.showToast({
              icon: 'none',
              title: '上传失败',
            })
          },
          complete: () => {
            wx.hideLoading()
          }
        })

      },
      fail: e => {
        console.error(e)
      }
    })
  },

})
