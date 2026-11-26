'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeLanguage,translateText,formatCurrency,translations}=require('../public/i18n');
test('supports Burmese and English locale identifiers',()=>{
 assert.equal(normalizeLanguage('en'),'en');assert.equal(normalizeLanguage('EN'),'en');
 assert.equal(normalizeLanguage('my'),'my');assert.equal(normalizeLanguage('unknown'),'my');
});
test('translates known UI copy into English and back while preserving whitespace',()=>{
 assert.equal(translateText('ဝန်ဆောင်မှုများ','en'),'Services');
 assert.equal(translateText('Services','my'),'ဝန်ဆောင်မှုများ');
 assert.equal(translateText('  စစ်ဆေးရန်  ','en'),'  Check status  ');
});
test('leaves unknown and customer-provided text unchanged',()=>{
 assert.equal(translateText('My custom service name','en'),'My custom service name');
 assert.equal(translateText('ကိုယ်ပိုင်ဝန်ဆောင်မှုအမည်','en'),'ကိုယ်ပိုင်ဝန်ဆောင်မှုအမည်');
});
test('formats prices using the active language',()=>{
 assert.equal(formatCurrency(25000,'my'),'25,000 ကျပ်');
 assert.equal(formatCurrency(25000,'en'),'25,000 MMK');
});
test('covers customer, payment and admin workflows',()=>{
 assert.ok(Object.keys(translations).length>=100);
 assert.equal(translateText('Payment Account အသစ်ထည့် / ပြင်ဆင်ရန်','en'),'Add / edit payment account');
 assert.equal(translateText('Order အောင်မြင်ပါပြီ။ Code:','en'),'Order created successfully. Code:');
 assert.equal(translateText('အော်ဒါများ','en'),'Orders');
});
