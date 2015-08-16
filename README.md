mongoose-stripe-customers
====================

A [mongoose.js](https://github.com/LearnBoost/mongoose/) A mongoose plugin that creates a stripe customer when a new document is created and stores the [Stripe](https://stripe.com) customer ID to that document.

## Use Case
If you are running an ecommerce type application using Stripe and create your own customer/user database objects, as well as Stripe customer objects, use this plugin to simultaneously aggregate your customer information to Stripe when a new customer is created within your database.

This plugin is configurable to allow enough flexibility to work with various schema setups. Just provide the names of your fields such as `email` or `phone` and the plugin will map those over to Stripe meta data objects.

## Installation

`npm install --save mongoose-stripe-customers`

## API Reference
**Example**  
```js
var mongooseStripeCustomers = require('mongoose-stripe-customers');

var schema = Schema({...});

schema.plugin(authPlugin, {
    stripeApiKey: 'XXXXXXXXXXXXXXXX',
    hook: 'save',
    firstNameField: 'first_name',
    lastNameField: 'last_name',
    emailField: 'email',
    metaData: [ '_id', 'phone', 'customerType' ]
});
 ```
<a name="module_mongoose-stripe-customers..options"></a>
### mongoose-stripe-customers~options
**Kind**: inner property of <code>[mongoose-stripe-customers](#module_mongoose-stripe-customers)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>object</code> |  |  |
| options.stripeApiKey | <code>string</code> |  | The Stripe secret key used to access the Stripe API. |
| [options.hook] | <code>string</code> | <code>&quot;save&quot;</code> | The document hook you want this to run before. |
| [options.fieldNames] | <code>object</code> |  | Response field overrides. |
| [options.stripeCustomerIdField] | <code>string</code> | <code>&quot;stripe_customer_id&quot;</code> | The field in which you want the Stripe customer ID value to be stored. |
| [options.firstNameField] | <code>string</code> |  | The field in which the customer's first name is stored. |
| [options.lastNameField] | <code>string</code> |  | The field in which the customer's last name is stored. |
| [options.emailField] | <code>string</code> |  | The field in which the customer's email address is stored. |
| [options.metaData[]] | <code>Array.&lt;string&gt;</code> |  | If you want any extra data stored with the customer on Stripe, provide an array of field names. |

