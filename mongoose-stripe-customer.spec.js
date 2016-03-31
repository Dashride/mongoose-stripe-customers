var mongoose = require('mongoose');
var expect = require('chai').expect;
var fs = require('fs');
var mongooseStripeCustomers = require('./mongoose-stripe-customers');
var Schema = mongoose.Schema;
var connection;

var STRIPE_API_KEY = process.env.STRIPE_TEST_KEY;

var stripe = require('stripe')(STRIPE_API_KEY);

mongoose.Promise = global.Promise;

function customerSchema() {
    return new Schema({
        firstName: { type: String },
        lastName: { type: String },
        customerType: { type: String },
        phone: { type: String },
        email: { type: String }
    });
}

function customerSchemaWithStripeID() {
    return new Schema({
        firstName: { type: String },
        lastName: { type: String },
        customerType: { type: String },
        phone: { type: String },
        email: { type: String },
        stripe_customer_id: { type: String }
    });
}

describe('Mongoose plugin: mongoose-stripe-customers', function() {
    before(function (done) {
        connection = mongoose.createConnection(process.env.MONGO_URL || 'mongodb://localhost/unit_test');
        connection.once('connected', done);
    });

    after(function(done) {
        connection.db.dropDatabase(function() {
            connection.close(done);
        });
    });

    describe('without Stripe API key provided', function() {

        it('should throw an API key error', function() {
            var errorThrown = false;
            var testSchema = customerSchema();

            try {
                testSchema.plugin(mongooseStripeCustomers);
            } catch(e) {
                errorThrown = true;
            }

            expect(errorThrown).to.equal(true);
        });

    });

    describe('with default settings', function() {
        var testSchema;

        before(function() {
            testSchema = customerSchema();
            testSchema.plugin(mongooseStripeCustomers, {
                stripeApiKey: STRIPE_API_KEY
            });
        });

        it('should add a stripe_customer_id field to the schema', function() {
            expect(testSchema.paths.stripe_customer_id).to.not.equal(undefined);
        });

        it('should not add the stripe_customer_id field to the schema if it is already there.', function() {
            var testSchema = customerSchemaWithStripeID();
            testSchema.plugin(mongooseStripeCustomers, {
                stripeApiKey: STRIPE_API_KEY
            });

            expect(testSchema.paths.stripe_customer_id).to.not.equal(undefined);
        });

        it('should assign a stripe_customer_id to the model during creation', function() {
            Customer = connection.model('Customer', testSchema);
            customer = new Customer({
                firstName: 'test',
                lastName: 'customer',
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            return customer.save().then(function (savedCustomer) {
                expect(savedCustomer.stripe_customer_id).to.not.equal(undefined);
                expect(savedCustomer.stripe_customer_id.substr(0, 4)).to.equal('cus_');
            });
        });
    });

    describe('with default overrides', function() {
        var testSchema, customer;

        before(function() {
            testSchema = customerSchema();
            testSchema.plugin(mongooseStripeCustomers, {
                stripeApiKey: STRIPE_API_KEY,
                stripeCustomerIdField: 'stripeCustomerID',
                firstNameField: 'firstName',
                lastNameField: 'lastName',
                emailField: 'email',
                metaData: [ 'customerType', 'phone', '_id' ]
            });
        });

        it('should have all override data on the stripe customer', function() {
            CustomerOverrides = connection.model('CustomerOverrides', testSchema);
            customer = new CustomerOverrides({
                firstName: 'test',
                lastName: 'customer',
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            return customer.save().then(function(savedCustomer) {
                return stripe.customers.retrieve(savedCustomer.stripeCustomerID);
            }).then(function(stripeCustomer) {
                expect(stripeCustomer.description).to.equal(customer.firstName + ' ' + customer.lastName);
                expect(stripeCustomer.email).to.equal(customer.email);
                expect(stripeCustomer.metadata.phone).to.equal(customer.phone);
                expect(stripeCustomer.metadata.customerType).to.equal(customer.customerType);
                expect(stripeCustomer.metadata._id).to.equal(customer.id);
            });
        });

        it('should not attempt to create the Stripe customer if the doc is old', function() {
            var oldStripeCustomerID = customer.stripeCustomerID;

            return customer.save().then(function(savedCustomer) {
                expect(savedCustomer.stripeCustomerID).to.equal(oldStripeCustomerID);
            });
        });
    });

    describe('with default overrides', function() {
        var testSchema, customer;

        before(function() {
            testSchema = new Schema({
                name: {
                    first: { type: String },
                    last: { type: String }
                },
                customerType: { type: String },
                phone: { type: String },
                email: { type: String }
            });
            testSchema.plugin(mongooseStripeCustomers, {
                stripeApiKey: STRIPE_API_KEY,
                stripeCustomerIdField: 'stripeCustomerID',
                firstNameField: 'name.first',
                lastNameField: 'name.last',
                emailField: 'email',
                metaData: [ 'customerType', 'phone', '_id' ]
            });
        });

        it('should allow override data to be embedded documents on the stripe customer', function() {
            CustomerEmbedOverrides = connection.model('CustomerEmbedOverrides', testSchema);
            customer = new CustomerEmbedOverrides({
                name: {
                    first: 'test',
                    last: 'customer'
                },
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            return customer.save().then(function(savedCustomer) {
                return stripe.customers.retrieve(savedCustomer.stripeCustomerID);
            }).then(function(stripeCustomer) {
                expect(stripeCustomer.description).to.equal(customer.name.first + ' ' + customer.name.last);
                expect(stripeCustomer.email).to.equal(customer.email);
                expect(stripeCustomer.metadata.phone).to.equal(customer.phone);
                expect(stripeCustomer.metadata.customerType).to.equal(customer.customerType);
                expect(stripeCustomer.metadata._id).to.equal(customer.id);
            });
        });
    });

    describe('with default overrides', function() {
        var testSchema, customer;

        before(function() {
            testSchema = customerSchema();
            testSchema.plugin(mongooseStripeCustomers, {
                stripeApiKey: STRIPE_API_KEY,
                stripeCustomerIdField: 'stripeCustomerID',
                firstNameField: 'firstName',
                lastNameField: 'lastName',
                emailField: 'email',
                metaData: [ 'customerType', 'phone', '_id', 'address' ]
            });
        });

        it('should not use keys from the model that do not exist', function() {
            var CustomerOverrides2 = connection.model('CustomerOverrides2', testSchema);
            customer = new CustomerOverrides2({
                firstName: 'test',
                lastName: 'customer',
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            return customer.save().then(function(savedCustomer) {
                return stripe.customers.retrieve(savedCustomer.stripeCustomerID);
            }).then(function(stripeCustomer) {
                expect(stripeCustomer.metadata.address).to.equal(undefined);
            });
        });
    });
});
