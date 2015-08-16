var mongoose = require('mongoose'),
    expect = require('chai').expect,
    fs = require('fs'),
    mongooseStripeCustomers = require('./mongoose-stripe-customers'),
    Schema = mongoose.Schema,
    connection;

var STRIPE_API_KEY = process.env.STRIPE_TEST_KEY;

var stripe = require('stripe')(STRIPE_API_KEY);

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
        connection = mongoose.createConnection('mongodb://localhost/unit_test');
        connection.once('connected', function() {
            done();
        });
    });

    after(function(done) {
        connection.db.dropDatabase(function() {
            connection.close(function() {
                done();
            });
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

        it('should assign a stripe_customer_id to the model during creation', function(done) {
            Customer = connection.model('Customer', testSchema);
            customer = new Customer({
                firstName: 'test',
                lastName: 'customer',
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            customer.save(function(err) {
                if(err) {
                    done(err);
                } else {
                    expect(customer.stripe_customer_id).to.not.equal(undefined);
                    expect(customer.stripe_customer_id.substr(0, 4)).to.equal('cus_');
                    done();
                }
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

        it('should have all override data on the stripe customer', function(done) {
            CustomerOverrides = connection.model('CustomerOverrides', testSchema);
            customer = new CustomerOverrides({
                firstName: 'test',
                lastName: 'customer',
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            customer.save(function(err) {
                if(err) {
                    done(err);
                } else {
                    stripe.customers.retrieve(customer.stripeCustomerID)
                        .then(function(stripeCustomer) {
                            expect(stripeCustomer.description).to.equal(customer.firstName + ' ' + customer.lastName);
                            expect(stripeCustomer.email).to.equal(customer.email);
                            expect(stripeCustomer.metadata.phone).to.equal(customer.phone);
                            expect(stripeCustomer.metadata.customerType).to.equal(customer.customerType);
                            expect(stripeCustomer.metadata._id).to.equal(customer.id);
                            done();
                        }, done);
                }
            });
        });

        it('should not attempt to create the Stripe customer if the doc is old', function(done) {
            var oldStripeCustomerID = customer.stripeCustomerID;

            customer.save(function(err) {
                if(err) {
                    done(err);
                } else {
                    expect(oldStripeCustomerID).to.equal(customer.stripeCustomerID);
                    done();
                }
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

        it('should not use keys from the model that do not exist', function(done) {
            var CustomerOverrides2 = connection.model('CustomerOverrides2', testSchema);
            customer = new CustomerOverrides2({
                firstName: 'test',
                lastName: 'customer',
                customerType: 'testing',
                phone: '1112223333',
                email: 'test@testing.com'
            });

            customer.save(function(err) {
                if(err) {
                    done(err);
                } else {
                    stripe.customers.retrieve(customer.stripeCustomerID)
                        .then(function(stripeCustomer) {
                            expect(stripeCustomer.metadata.address).to.equal(undefined);
                            done();
                        }, done);
                }
            });
        });
    });
});
