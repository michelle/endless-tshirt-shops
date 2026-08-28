const express = require('express');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
const PassThrough = require('stream').PassThrough;

const app = express();

app.use(bodyParser.json({limit: '5mb'}));

const SP_API = 'https://api.scalablepress.com/v2/';
const SP_AUTH = process.env.SP_AUTH;
const STRIPE_AUTH = process.env.STRIPE_AUTH;
const stripe = require('stripe')(STRIPE_AUTH);

// {
//   shirt: {
//     size:,
//     style:,
//     artwork:,
//   },
//   stripeToken: ...,
//   address: {
//     street1:,
//     street2:,
//     city:
//     zipcode:,
//   }
// }

const PRODUCTS = {
  // fitted: 'bella-ladies-favorite-t-shirt', // 16.4
  fitted: 'next-level-boyfriend-tee', // 16.5
  unisex: 'next-level-fitted-crew', // 16.94
  //unisex: 'american-apparel-t-shirt',
  //unisex: 'american-apparel-50-50-t-shirt',
  //unisex: 'next-level-cvc-crew', // 17.16
  //unisex: 'canvas-v-neck-t-shirt', // 17.46
  //unisex: 'canvas-unisex-t-shirt', // 16.81
  //unisex: 'alternative-apparel-basic-crew-t-shirt', //18.36
};
const SIZES = {
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
};

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

const auth = {
  user: '',
  password: SP_AUTH,
};



const makeDesign = (count, buf, next, successCb) => {
  var r = request.post({
    url: SP_API + 'design',
    auth,
    json: true
  }, function(err, res, body) {
    if (err) {
      return next(err);
    }
    if (res.statusCode !== 200) {
      console.error('[BAD - SP] Design error: ', res.statusCode, JSON.stringify(body));
      
      if (count > 3) {
        console.log('[BAD - SP] Design error, bailing:', JSON.stringify(body))
        return next(body);
      } else {
        console.log('[BAD - SP] Design error, retrying:', JSON.stringify(body))
        return makeDesign(count + 1, buf, next, successCb);
      }
    }

    console.log('[INFO] Got design ID:', res.body.designId);
    return successCb(res.body.designId);
  });

  const form = r.form();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', buf, {
    filename: 'artwork.png',
    contentType: 'image/png',
  });
  form.append('sides[front][dimensions][width]', '8'); // inches
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', '3'); // inches
};

app.post('/order', (req, res, next) => {
  res.header('Content-Type', 'application/json');
  const {shirt, address, stripeToken, email} = req.body;
  const artBuffer = Buffer.from(shirt.artwork.split(',')[1], 'base64');

  // CREATE DESIGNID
  makeDesign(0, artBuffer, next, (designId) => {
    // CREATE ORDERTOKEN
    request.post(
      {
        url: `${SP_API}quote`,
        auth,
        body: {
          type: 'dtg',
          products: [
            {
              id: PRODUCTS[shirt.style],
              color: shirt.style === 'fitted' ? 'Black' : 'Black',
              quantity: 1,
              size: SIZES[shirt.size],
            },
          ],
          designId,
          address,
        },
        json: true,
      },
      (err, response) => {
        if (err) {
          return next(err);
        } else if (
          response.body.statusCode > 300 ||
          (response.body.orderIssues && response.body.orderIssues.length)
        ) {
          console.log('[Quote error]', response.body);
          return next(response.body);
        } else {
          // CREATE PAYMENT
          stripe.charges.create(
            {
              amount: 2250,
              currency: 'usd',
              card: stripeToken,
              receipt_email: email,
              description: `A datetime shirt (ID: ${response.body.orderToken})`,
            },
            (err, charge) => {
              if (err) {
                console.log('[Stripe error]', err);
                return next({
                  error: {
                    message: err.message,
                    type: err.type,
                    code: err.code,
                  },
                });
              } else {
                // CREATE ORDERID
                request.post(
                  {
                    url: `${SP_API}order`,
                    json: true,
                    auth,
                    body: {
                      orderToken: response.body.orderToken,
                    },
                  },
                  (err, response) => {
                    console.log('ORDER', response.body);
                    if (err) {
                      return next(err);
                    } else if (response.body.statusCode > 300) {
                      console.log('[Order error]', response.body);
                      return next(response.body);
                    } else {
                      res.json({order: response.body.orderId});
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  });
});

app.use('/static', express.static(path.join(__dirname, '../build/static')));
app.use(
  '/.well-known',
  express.static(path.join(__dirname, '../build/.well-known'))
);
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../build/index.html'))
);
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(400).send(err.stack || err);
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`listening on port ${server.address().port}`);
});
