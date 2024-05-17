var backTimeWait = 60;      //当时间低于多少秒时，开始往回滑动
var maxBackTimes = 20;      //最大能累计的返回次数，超过则不管剩余时间，回去看看(todo)
var maxRemainTime = 60*10;   //福袋最大剩余时间，超过则当福袋不存在
var fastBackRate = 1000;    //快速滑动速率
var needFocusOn = true; //是否关注主播
var minPercent = 10;    //抢福袋的最低命中率(%)
var minInQueuePercent = 10; //最低的进入等待队列的抢福袋命中率(%)

var times = 0;
var lastUserName = '';

var getMoneyTimeArray = [];
var getMoneyUpTimesArray = [];
var pushToLastTimes = 0;
var alreadyGetTimes = 0;
var alreadyMoneyTimes = 0;

function moveDown() {
    if (id("user_name").exists()) {
        lastUserName = id("user_name").findOne().text();
    }
    removeOverlay();
    scrollDown();
    sleep(5000);
}

function fastMove(isUp) {
    if (id("user_name").exists()) {
        lastUserName = id("user_name").findOne().text();
    }

    if (isUp) {
        scrollUp();
    } else {
        scrollDown();
    }
    sleep(fastBackRate);
    var currentUserName = id("user_name").findOne().text();
    if (lastUserName == currentUserName) {
        fastMove(isUp);
    } else {
        //计算剩余次数
        if (isUp) {
            for (var i = getMoneyUpTimesArray.length -1; i >=0; i--) {
                getMoneyUpTimesArray[i] = getMoneyUpTimesArray[i] - 1;
            }
            pushToLastTimes++;
        } else {
            for (var i = getMoneyUpTimesArray.length -1; i >=0; i--) {
                getMoneyUpTimesArray[i] = getMoneyUpTimesArray[i] + 1;
            }
            pushToLastTimes--;
        }
    }
}

function backToNewest() {
    if (pushToLastTimes  < 0) {
        pushToLastTimes = 0;
    } else {
        while (pushToLastTimes > 0) {
            fastMove(false);
            backToGetMoney();
        }
    }
}

function removeOverlay() {
    clickButton("关闭福袋");
    clickButton("知道了");
    removeHitOverlay();
}

function removeHitOverlay() {
    var findButton = className("android.widget.Button").text("赠送主播礼物表示心意");
    if (findButton.exists()) {
        alreadyMoneyTimes++;
        console.log("关闭中奖框");
        back();
        sleep(500);
    }
}

function clickButton(textString) {
    var findButton = className("android.widget.Button").text(textString);
    if (findButton.exists()) {
        console.log("关闭弹出按钮：" + textString);
        findButton.findOne().click();
        sleep(500);
    }
}

function getPercent() {
    var result = textEndsWith("人已参加").exists();
    result &= textEndsWith("个福袋").exists();
    if (result) {
        var currentRate = 100;
        var totalRobString = textEndsWith("人已参加").findOne().text();
        var totalAwardString = textEndsWith("个福袋").findOne().text();
        var totalRob = parseInt(totalRobString.substring(0, totalRobString.indexOf("人")));
        var totalAward = parseInt(totalAwardString.substring(0, totalAwardString.indexOf("个")));
        if (totalAward < totalRob) {
            currentRate = totalAward*100/totalRob;
        }
        if (totalAward < 3) {
            currentRate = 0;
        }
        console.log(totalAward + "个福袋，" + totalRob + "已抢，" + "当前抢福袋概率：" + currentRate);

        return currentRate;
    } else {
        return 0;
    }
}

function backToGetMoney() {
    var now = new Date();
    var nowSeconds = now.getTime();
    for (var i = getMoneyTimeArray.length -1; i >=0; i--) {
        var getMoneySeconds = getMoneyTimeArray[i] - nowSeconds;
        getMoneySeconds/=1000;
        var getMoneyUpTimes = getMoneyUpTimesArray[i];
        //根据滑动速率和需要时间，计算次数，如果来不及，就不去了
        console.log("第" + i + "个剩余时间" + getMoneySeconds + "秒");
        if (getMoneySeconds*1000/fastBackRate < Math.abs(getMoneyUpTimes)) {
            getMoneyTimeArray.splice(i, 1);
            getMoneyUpTimesArray.splice(i, 1);
        } else if (Math.abs(getMoneyUpTimes)*fastBackRate/1000 > getMoneySeconds - backTimeWait){
            //判断往回滑时间如果在需要的时间+20秒之内，往回滑
            //往回滑
            console.log("往回滑"+ getMoneyUpTimes + "次");
            if (getMoneyUpTimes > 0) {
                backTimes(getMoneyUpTimes, true);
            } else {
                backTimes(Math.abs(getMoneyUpTimes), false);
            }
			
			//抢福袋
            var waitNow = new Date();
            var waitNowSeconds = waitNow.getTime();
            var waitSeconds = getMoneyTimeArray[i] - waitNowSeconds;
            waitSeconds/=1000;
            clickGetMoneyButton(waitSeconds);

            removeOverlay();
            getMoneyTimeArray.splice(i, 1);
            getMoneyUpTimesArray.splice(i, 1);
        }
    }
}

function clickGetMoneyButton(waitSeconds) {
    var waitTillSeconds = (new Date()).getTime() + waitSeconds*1000;

    var focusOnButton = id("hrp");
    if (focusOnButton.exists() && needFocusOn) {
        focusOnButton.findOne().click();
        sleep(500);
    }

    for (var i = 0; i < waitSeconds; i++) {
        removeOverlay();
        var moneyControls = className("android.widget.Button").descStartsWith("福袋");
        if (moneyControls.exists()) {
            //福袋存在
            //获取福袋控件
            var moneyControl = moneyControls.findOne();
            moneyControl.click();
            sleep(1000);

            //发表评论抢福袋，需判断是否是只发表评论就行
            for (var i = 0; i < 5; i++) {
                var commonPublishControlFind = text("去发表评论");
                if (commonPublishControlFind.exists()) {
                    //判断概率是否满足
                    if (getPercent() > minPercent) {
                        var commonPublishControl = commonPublishControlFind.findOne();
                        commonPublishControl.click();
                        sleep(2000);
        
                        var sendMessageButton = text("发送").findOne();
                        sendMessageButton.click();
                        sleep(1000);
                        console.log("福袋存在，抢");
        
                        //记录次数
                        alreadyGetTimes++;
                        console.log("已经抢福袋" + alreadyGetTimes + "次");
                        console.log("已经中奖" + alreadyMoneyTimes + "次");
        
                        //等待开奖
                        var needWaitTime = waitTillSeconds - (new Date()).getTime() + 5000;
                        if (needWaitTime > 0) {
                            console.log("停留" + (needWaitTime/1000) + "秒等待抢福袋");
                            sleep(needWaitTime);
                        }
                    } else {
                        //概率不满足，不抢了
                        console.log("概率不满足，不抢了");
                    }
                    break;
                }

                sleep(1000);
            }
            
            break;
        }
        
        sleep(1000);
    }
}

function backTimes(times, isUp) {
    for (var i = 0; i < times; i++) {
        fastMove(isUp);
    }
}

while(true){
    times++;
    console.log("第"+times+"轮");
    console.log("已经抢福袋" + alreadyGetTimes + "次");
    console.log("已经中奖" + alreadyMoneyTimes + "次");

    var currentUserName = '';
    for (var i = 0; i < 5; i++) {
        if (id("user_name").exists()) {
            currentUserName = id("user_name").findOne().text();
            break;
        }
        sleep(1000);
    }

    while (lastUserName == currentUserName) {
        //滑动失败，重滑
        console.log("滑动失败，重滑");
        moveDown();
    }

    //计算所有福袋需要返回的次数
    for (var i = getMoneyUpTimesArray.length -1; i >=0; i--) {
        getMoneyUpTimesArray[i] = getMoneyUpTimesArray[i] + 1;
    }

    //判断是否要往回滑
    backToGetMoney();

    //快速滑到最下面的直播间
    backToNewest();
    
    //点击外层layout，清理弹出控件
    removeOverlay();

    var moneyControls = className("android.widget.Button").descStartsWith("福袋");
    if (moneyControls.exists()) {
        //福袋存在
        //获取福袋控件
        var moneyControl = moneyControls.findOne();
        //判断福袋剩余时间
        var leftMinutes = 0;
        var leftSeconds = 0;

        var timeArray = moneyControl.desc().split("，");
        var leftTime = timeArray[1];
        var leftSecondString = leftTime;
        if (leftTime == undefined) {
            continue;
        }

        if (leftTime.indexOf("分") > 0) {
            var minSecString = leftTime.split("分");
            leftMinutes = parseInt(minSecString[0]);
            leftSecondString = minSecString[1];
        }
        leftSeconds = parseInt(leftSecondString.substring(0, leftSecondString.indexOf("秒")));
        leftSeconds = leftMinutes*60 + leftSeconds;
        console.log("剩余时间（秒）：" + leftSeconds);

        moneyControl.click();
        sleep(1000);

        //发表评论抢福袋，需判断是否是只发表评论就行
        var commonPublishControlFind = text("去发表评论");
        var funsNecessary = text("加入粉丝团").exists();
        var percentMeet = getPercent() > minInQueuePercent;
        var leftTimeMeet = leftSeconds < maxRemainTime;
        if (commonPublishControlFind.exists() && !funsNecessary && percentMeet && leftTimeMeet) {
            var now = new Date();
            //1分钟之内就不划走了
            leftSeconds -= 3;
            if (leftSeconds < backTimeWait) {
                //计算等待时间
                console.log(leftSeconds + "秒内，不走了");
                clickGetMoneyButton(leftSeconds);
            } else {
                getMoneyTimeArray.push(now.getTime() + leftSeconds*1000);
                getMoneyUpTimesArray.push(0);
            }
            removeOverlay();
        } else {
            removeOverlay();
            console.log("福袋存在，但不是评论福袋或者概率不满足");
        }

        moveDown();
    } else {
        //福袋不存在，下滑
        console.log("福袋不存在或概率不满足");
        moveDown();
    }
}





















