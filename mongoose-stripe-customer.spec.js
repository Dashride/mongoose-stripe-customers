var mongoose = require('mongoose'),
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

describe('Mongoose plugin: mongoose-stripe-customers', function() {
    beforeAll(function (done) {
        connection = mongoose.createConnection('mongodb://localhost/unit_test');
        connection.once('connected', function() {
            done();
        });
    });

    afterAll(function(done) {
        connection.db.dropDatabase(function() {
            connection.close(function() {
                done();
            });
        });
    });

    describe('with default settings', function() {
        var testSchema;

        beforeEach(function() {
            testSchema = customerSchema();
            testSchema.plugin(mongooseStripeCustomers, {
                stripeApiKey: STRIPE_API_KEY
            });
        });

        it('should add a stripe_customer_id field to the schema', function() {
            expect(testSchema.paths.stripe_customer_id).toBeDefined();
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
                    expect(customer.stripe_customer_id).toBeDefined();
                    expect(customer.stripe_customer_id.substr(0, 4)).toBe('cus_');
                    done();
                }
            });
        });
    });

    describe('with default overrides', function() {
        var testSchema;

        beforeEach(function() {
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
                            expect(stripeCustomer.description).toBe(customer.firstName + ' ' + customer.lastName);
                            expect(stripeCustomer.email).toBe(customer.email);
                            expect(stripeCustomer.metadata.phone).toBe(customer.phone);
                            expect(stripeCustomer.metadata.customerType).toBe(customer.customerType);
                            expect(stripeCustomer.metadata._id).toBe(customer.id);
                            done();
                        }, done);
                }
            });
        });
    });
});
