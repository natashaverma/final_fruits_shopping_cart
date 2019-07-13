var express = require('express');
var router = express.Router();

var fs = require('fs');
var Cart = require('../models/cart');
var Order = require('../models/order');

var products = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));

router.get('/', function (req, res, next) {
  var successMsg = req.flash('success'[0]);
  var productId = products && products[0].id;
  res.render('index', 
  { 
    title: 'NodeJS Shopping Cart',
    products: products, successMsg: successMsg, noMessages: !successMsg });
});

router.get('/add/:id', function(req, res, next) {

  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  var product = products.filter(function(item) {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect('/');
  //inline();
});

router.get('/cart', function(req, res, next) {
  if (!req.session.cart) {
    return res.render('cart', {
      products: null
    });
  }
  var cart = new Cart(req.session.cart);
  res.render('cart', {
    title: 'NodeJS Shopping Cart',
    products: cart.getItems(),
    totalPrice: cart.totalPrice
  });
});

router.get('/remove/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.remove(productId);
  req.session.cart = cart;
  res.redirect('/cart');
});

router.get('/checkout', isLoggedIn, function(req,res , next) {
  if(!req.session.cart) {
    return res.redirect('/cart');
  }
  var cart = new Cart(req.session.cart);
  var errMsg = req.flash('error')[0];
  res.render('checkout', {total : cart.totalPrice , errMsg: errMsg, noError: !errMsg});
})

router.post('/checkout' ,isLoggedIn, function(req, res , next) {
  if(!req.session.cart){
    return res.redirect('/cart');
  }
  var cart = new Cart(req.session.cart);

  var stripe = require("stripe")(
    "sk_test_TjYDieKp3znCixH8v3opn4cR00AOMMMokE"
  );
  
  stripe.charges.create({
    amount: cart.totalPrice * 100,
    currency: "inr",
    source: 'tok_mastercard',   // obtained with Stripe.js
    description: "Test Charge"
}, function(err, charge) {
    if (err) {
        req.flash('error', err.message);
        return res.redirect('/checkout');
    }
    req.flash('success' , 'Successfully bought the product');
    var order = new Order({
        user: req.user,
        cart: cart,
        address: req.body.address,
        name: req.body.name,
        paymentId: charge.id
    });
    order.save(function(err, result) {
        req.flash('success', 'Successfully bought product!');
        req.session.cart = null;
        res.redirect('/');
    });
}); 
});



module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  req.session.oldUrl = req.url;
  res.redirect('/user/signin');
}