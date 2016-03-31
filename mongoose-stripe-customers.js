var _ = require('lodash');
var util = require('util');

/**
 * @module mongoose-stripe-customers
 * @example
 ```js
var mongooseStripeCustomers = require('mongoose-stripe-customers');

var schema = Schema({...});

schema.plugin(mongooseStripeCustomers, {
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

    if(!options.stripeApiKey) {
        throw new Error('Stripe API key must be provided to mongoose-stripe-customers.');
    }

    var stripe = require('stripe')(options.stripeApiKey);

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
        var customer = {
            metadata: {}
        };
        var firstName;
        var lastName;

        if(!doc.isNew) {
            // They already are a stripe customer, do nothing.
            return done();
        }

        // If the document is new, or the document doesn't have a stripe customer yet, create one.
        if(options.emailField) {
            customer.description = customer.email = doc.get(options.emailField]);
        }

        if(options.firstNameField && options.lastNameField) {
            firstName = doc.get(options.firstNameField);
            lastName = doc.get(options.lastNameField);

            customer.description = firstName + ' ' + lastName;
            _.set(customer.metadata, options.firstNameField, firstName);
            _.set(customer.metadata, options.lastNameField, lastName);
        }

        if(options.metaData instanceof Array && options.metaData.length) {
            options.metaData.forEach(function(key) {
                var val = doc.get(key);

                if(val) {
                    _.set(customer.metadata, key, (key === '_id') ? val.toString() : val);
                }
            });
        }

        stripe.customers.create(customer)
            .then(function(customer) {
                doc.set(options.stripeCustomerIdField, customer.id);
                done();
            }, done);
    });

};
