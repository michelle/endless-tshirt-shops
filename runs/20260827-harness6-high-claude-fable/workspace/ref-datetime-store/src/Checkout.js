import React from 'react';
import {
  FormGroup,
  FormControl,
  HelpBlock,
  ControlLabel,
  Radio,
  Button,
  Glyphicon,
} from 'react-bootstrap';
import CheckoutForm from './CheckoutForm';
import './Checkout.css';

const STRIPE_KEY = process.env.NODE_ENV === 'production'
  ? 'pk_live_i8dM4Z7Z9yHAry8CUyfG2zzu'
  : 'pk_test_qCMrlL2cgZqc4jlUQH6WEyBS';
const API_URL = process.env.NODE_ENV === 'production'
  ? '/order'
  : 'http://localhost:3002/order';

export default class extends React.Component {
  static propTypes = {
    onStyleChange: React.PropTypes.func.isRequired,
    onCheckout: React.PropTypes.func.isRequired,
    onComplete: React.PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      disabled: false,
      manual: false,
      loading: true,
      orderId: null,
      orderErrors: [],
      style: 'fitted',
      size: 'M',
    };
    this.setupStripe();
  }
  setupStripe() {
    this._stripe = Stripe(STRIPE_KEY); // eslint-disable-line
    const paymentRequest = this._stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      requestShipping: true,
      requestPayerEmail: true,
      shippingOptions: [
        {label: '📦 Free shipping!', amount: 0, selected: true},
      ],
      total: {
        label: 'Shirt total',
        amount: 2250,
      },
    });
    const elements = this._stripe.elements();
    this._prButton = elements.create('paymentRequestButton', {
      paymentRequest,
      style: {paymentRequestButton: {height: '644px', type: 'buy'}},
    });

    paymentRequest.canMakePayment().then(result => {
      this.setState({loading: false, manual: !result});
    });

    paymentRequest.on('token', result => {
      this.setState({disabled: true});
      this.props.onCheckout();
      return fetch(API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: result.payerEmail,
          address: {
            name: result.shippingAddress.recipient,
            city: result.shippingAddress.city,
            state: result.shippingAddress.region,
            address1: result.shippingAddress.addressLine[0],
            address2: result.shippingAddress.addressLine[1],
            zip: result.shippingAddress.postalCode,
          },
          shirt: {
            artwork: document.querySelector('canvas').toDataURL(),
            style: this.state.style,
            size: this.state.size,
          },
          stripeToken: result.token.id,
        }),
      })
        .then(res => {
          // TODO
          return res.json();
        })
        .then(payload => {
          if (payload.order) {
            result.complete('success');
          } else {
            result.complete('fail');
          }
          this.setState({
            disabled: false,
            orderId: payload.order,
            error: payload.error,
            orderErrors: payload.issues || payload.orderIssues || [],
          });
        });
    });

    this._cardField = elements.create('card', {
      classes: {
        empty: 'is-empty',
        focus: 'is-focused',
        invalid: 'is-invalid',
      },
      style: {
        base: {
          lineHeight: '28px',
          placeholderColor: '#ccc',
          fontSize: '16px',
          fontWeight: 400,
          fontSmoothing: 'antialiased',
          fontFamily: 'Helvetica Neue, Helvetica, sans-serif',
        },
      },
    });
    this._cardField.on('change', payload => {
      this.setState({error: payload.error});
    });
  }
  handleChange = name => e => {
    if (name === 'style') {
      this.props.onStyleChange(e.target.value);
    }
    this.setState({[name]: e.target.value});
  };
  handleSubmit = data => {
    this.setState({disabled: true});
    this.props.onCheckout();
    this._stripe
      .createToken(this._cardField)
      .then(({token, error}) => {
        if (token) {
          return fetch(API_URL, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...data,
              shirt: {
                artwork: document.querySelector('canvas').toDataURL(),
                style: this.state.style,
                size: this.state.size,
              },
              stripeToken: token.id,
            }),
          });
        } else {
          throw error;
        }
      })
      .then(res => {
        // TODO
        return res.json();
      })
      .then(payload => {
        this.setState({
          disabled: false,
          orderId: payload.order,
          error: payload.error,
          orderErrors: payload.issues || payload.orderIssues || [],
        });
      })
      .catch(err => {
        // TODO
        this.setState({disabled: false});
        this.props.onComplete();
      });
  };

  handlePrapiButton = ref => {
    if (ref) {
      this._prButton.mount(ref);
    }
  };
  handleReset = () => {
    this.setState({orderId: null});
    this.props.onComplete();
  };
  handleSwitchClick = () => {
    this.setState({manual: true});
  };
  renderForm() {
    const {disabled, error, orderErrors} = this.state;
    return (
      <CheckoutForm
        onSubmit={this.handleSubmit}
        cardElement={this._cardField}
        disabled={disabled}
        error={error}
        orderErrors={orderErrors}
      />
    );
  }
  renderSuccess() {
    return (
      <div className="Checkout-success">
        <p className="Checkout-success-title">
          Congrats on your pretty cool shirt!
        </p>
        <p>
          You should receive an email shortly with your order confirmation number.
        </p>
        <button onClick={this.handleReset}>
          <Glyphicon glyph="heart" />{' '}
          Get another shirt
        </button>
      </div>
    );
  }
  renderStyles() {
    return (
      <div className="styles">
        {[['fitted', 'Fitted'], ['unisex', 'Unisex']].map(style => (
          <div className="radio">
            <input
              id={style[0]}
              type="radio"
              key={style[0]}
              name="style"
              value={style[0]}
              onChange={this.handleChange('style')}
              checked={this.state.style === style[0]}
            />
            <label htmlFor={style[0]}>
              {style[1]}
            </label>
          </div>
        ))}
      </div>
    );
  }
  renderSizes() {
    return (
      <div className="sizes">
        {['S', 'M', 'L', 'XL'].map(size => (
          <div className="radio">
            <input
              id={size}
              type="radio"
              key={size}
              name="size"
              value={size}
              onChange={this.handleChange('size')}
              checked={this.state.size === size}
            />
            <label htmlFor={size}>
              {size}
            </label>
          </div>
        ))}
      </div>
    );
  }
  render() {
    const {orderId} = this.state;
    if (orderId) {
      return this.renderSuccess();
    } else if (this.state.loading) {
      // TODO: loading state?
      return <span />;
    } else if (this.state.manual) {
      return (
        <div>
          {this.renderStyles()}
          {this.renderSizes()}
          {this.renderForm()}
        </div>
      );
    } else {
      return (
        <div className="Checkout-prapi">
          {this.renderStyles()}
          {this.renderSizes()}
          <div className="Checkout-prapi-button" ref={this.handlePrapiButton} />
          <a className="Checkout-prapi-switch" onClick={this.handleSwitchClick}>
            Or enter details manually
          </a>
        </div>
      );
    }
  }
}
