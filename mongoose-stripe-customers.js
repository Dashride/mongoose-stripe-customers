var _ = require('lodash'),
    util = require('util');

/**
 * @module mongoose-stripe-customers
 * @example
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
 */

module.exports = function stripeCustomersPlugin(schema, options) {
    if(!options.stripeApiKey) {
        throw new Error('Stripe API key must be provided to mongoose-stripe-customers.');
    }

    var stripe = require('stripe')(options.stripeApiKey);

    /**
     * @param {object} options
     * @param {string} options.stripeApiKey - The Stripe secret key used to access the Stripe API.
     * @param {string} [options.hook=save] - The document hook you want this to run before.
     * @param {object} [options.fieldNames] - Response field overrides.
     * @param {string} [options.stripeCustomerIdField=stripe_customer_id] - The field in which you want the Stripe customer ID value to be stored.
     * @param {string} [options.firstNameField] - The field in which the customer's first name is stored.
     * @param {string} [options.lastNameField] - The field in which the customer's last name is stored.
     * @param {string} [options.emailField] - The field in which the customer's email address is stored.
     * @param {string[]} [options.metaData[]] - If you want any extra data stored with the customer on Stripe, provide an array of field names.
     */
    options = _.merge({
        hook: 'save',
        stripeCustomerIdField: 'stripe_customer_id'
    }, options || {});

    // Add the stripe customer id path to the schema.
    if(!schema.path(options.stripeCustomerIdField)) {
        schema.path(options.stripeCustomerIdField, {
            type: String,
            unique: true,
            trim: true
        });
    }

    schema.pre(options.hook, true, function createStripeCustomer(next, done) {
        next();

        var doc = this;

        // If the document is new, or the document doesn't have a stripe customer yet, create one.
        if(doc.isNew || !doc[options.stripeCustomerIdField]) {
            var customer = {
                metadata: {}
            };

            if(options.emailField) {
                customer.email = doc[options.emailField];
                customer.description = customer.email;
            }

            if(options.firstNameField && options.lastNameField) {
                var firstName = doc[options.firstNameField],
                    lastName = doc[options.lastNameField];
                customer.description = firstName + ' ' + lastName;
                customer.metadata[options.firstNameField] = firstName;
                customer.metadata[options.lastNameField] = lastName;
            }

            if(options.metaData instanceof Array && options.metaData.length) {
                options.metaData.forEach(function(key) {
                    if(doc[key]) {
                        customer.metadata[key] = (key === '_id') ? doc[key].toString() : doc[key];
                    }
                });
            }

            stripe.customers.create(customer)
                .then(function(customer) {
                    doc[options.stripeCustomerIdField] = customer.id;
                    done();
                }, function(err) {
                    done(err);
                });

        // They already are a stripe customer, do nothing.
        } else {
            done();
        }
    });

};
