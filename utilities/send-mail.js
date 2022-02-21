'use strict';
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const fs  = require('fs');
const path = require('path');

let config = {
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
}

if (process.env.SMTP_SERVICE != null) {
    config.service = process.env.SMTP_SERVICE;
} else {
    config.host = process.env.SMTP_HOST;
    config.port = parseInt(process.env.SMTP_PORT);
    config.secure = process.env.SMTP_SECURE === "false" ? false : true;
}

const transporter = nodemailer.createTransport(config);
let templateName = process.env.TEMPLATE_NAME ?  process.env.TEMPLATE_NAME : "default";
let noticeTemplate = ejs.compile(fs.readFileSync(path.resolve(process.cwd(), 'template', templateName, 'notice.ejs'), 'utf8'));
let sendTemplate = ejs.compile(fs.readFileSync(path.resolve(process.cwd(), 'template', templateName, 'send.ejs'), 'utf8'));


// 提醒站长
exports.notice = (comment) => {

    // 站长自己发的评论不需要通知
    if (comment.get('mail') === process.env.TO_EMAIL 
        || comment.get('mail') === process.env.SMTP_USER) {
        return;
    }

    // 根据不同的站点用不同的URL
    let siteName = "";
    let siteUrl = "";

    console.log("url--" + comment.get("url"));
    console.log("sitepath" + process.env.SITE_PATH_1);

    if (comment.get("url") === process.env.SITE_PATH_1) {
        siteName = process.env.SITE_NAME_1;
        siteUrl = process.env.SITE_URL_1;
    } else if (comment.get("url") === process.env.SITE_PATH_2) {
        siteName = process.env.SITE_NAME_2;
        siteUrl = process.env.SITE_URL_2;
    } else {
        siteName = process.env.SITE_NAME_DEFAULT;
        siteUrl = process.env.SITE_URL_DEFAULT;
    }

    console.log("sitename" + sitename + ";siteurl" + siteurl);

    let emailSubject = '👉 咚！「' + siteName + '」上有新评论了';
    let emailContent =  noticeTemplate({
                            siteName: siteName,
                            siteUrl: siteUrl,
                            name: comment.get('nick'),
                            text: comment.get('comment'),
                            url: siteUrl + comment.get('url')
                        });

    let mailOptions = {
        from: '"' + process.env.SENDER_NAME + '" <' + process.env.SMTP_USER + '>',
        to: process.env.TO_EMAIL ? process.env.TO_EMAIL : process.env.SMTP_USER,
        subject: emailSubject,
        html: emailContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        comment.set('isNotified', true);
        comment.save();
        console.log("收到一条评论, 已提醒站长");
    });
}



// 发送邮件通知他人
exports.send = (currentComment, parentComment)=> {

    // 站长被 @ 不需要提醒
    if (parentComment.get('mail') === process.env.TO_EMAIL 
        || parentComment.get('mail') === process.env.SMTP_USER) {
        return;
    }

    // 根据不同的站点用不同的URL
    let siteName = "";
    let siteUrl = "";

    console.log("url--" + comment.get("url"));
    console.log("sitepath" + process.env.SITE_PATH_1);
    if (comment.get("url") === process.env.SITE_PATH_1) {
        siteName = process.env.SITE_NAME_1;
        siteUrl = process.env.SITE_URL_1;
    } else if (comment.get("url") === process.env.SITE_PATH_2) {
        siteName = process.env.SITE_NAME_2;
        siteUrl = process.env.SITE_URL_2;
    } else {
        siteName = process.env.SITE_NAME_DEFAULT;
        siteUrl = process.env.SITE_URL_DEFAULT;
    }

    console.log("sitename" + sitename + ";siteurl" + siteurl);

    let emailSubject = '👉 叮咚！「' + siteName + '」上有人@了你';
    let emailContent = sendTemplate({
                            siteName: siteName,
                            siteUrl: siteUrl,
                            pname: parentComment.get('nick'),
                            ptext: parentComment.get('comment'),
                            name: currentComment.get('nick'),
                            text: currentComment.get('comment'),
                            url: siteUrl + currentComment.get('url') + "#" + currentComment.get('pid')
                        });
    let mailOptions = {
        from: '"' + process.env.SENDER_NAME + '" <' + process.env.SMTP_USER + '>',
        to: parentComment.get('mail'),
        subject: emailSubject,
        html: emailContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        currentComment.set('isNotified', true);
        currentComment.save();
        console.log(currentComment.get('nick') + " @了" + parentComment.get('nick') + ", 已通知.");
    });
};

// 该方法可验证 SMTP 是否配置正确
exports.verify = function(){
    console.log("....");
    transporter.verify(function(error, success) {
        if (error) {
            console.log(error);
        }
        console.log("Server is ready to take our messages");
    });    
};
