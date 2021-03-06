'use strict';

var fs = require('fs');

var test = require('../javascript-tasks-9/lib/flow');

var chai = require('chai');
var sinon = require('sinon');
var path = require('path');
chai.use(require('sinon-chai'));

var expect = chai.expect;
var assert = chai.assert;

function generateFunction(param, timeout, expectedData) {
    timeout = timeout || Math.floor(Math.random() * 1000);
    if (param === 'error') {
        return sinon.spy((next) => {
            setTimeout(() => next('error'), timeout);
        });
    }
    if (expectedData !== undefined) {
        return sinon.spy((data, next) => {
            assert(data === expectedData);
            setTimeout(() => next(null, param), timeout);
        });
    }
    return sinon.spy((next) => {
        setTimeout(() => next(null, param), timeout);
    });
}

describe('Тестирование библиотеки \'Котофайлы\'', () => {
    describe('Тестирование функции \'serial\'', () => {

        it('Должен вызывать коллбэк, если список функций пуст', () => {
            var callback = sinon.spy();

            test.serial([], callback);
            expect(callback).to.have.been.calledOnce;
            expect(callback).to.have.been.calledWith(null);
        });

        it('Должен вызывать единственную функцию без аргументов', (done) => {
            var func = generateFunction(1);
            var callback = sinon.spy(() => {
                expect(func).to.have.been.calledOnce;
                expect(callback).to.have.been.calledOnce;
                expect(callback).to.have.been.calledWith(null, 1);
                done();
            });

            test.serial([func], callback);
        });

        it('Должен объединять две функции в цепочку', (done) => {
            var func1 = generateFunction(1);
            var func2 = generateFunction(2, 80, 1);
            var callback = sinon.spy(() => {
                expect(func1).to.have.been.calledOnce;
                expect(func2).to.have.been.calledOnce;
                expect(callback).to.have.been.calledOnce;
                expect(callback).to.have.been.calledWith(null, 2);
                expect(func2.getCall(0).args[0]).to.be.equal(1);
                done();
            });

            test.serial([func1, func2], callback);
        });

        it('Не выполняется вторая функция, если первая вызвала ошибку', (done) => {
            var func1 = generateFunction('error');
            var func2 = generateFunction(2, 80, true);
            var callback = sinon.spy(() => {
                expect(func1).to.be.calledOnce;
                expect(func2).to.not.be.called;
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith('error');
                done();
            });

            test.serial([func1, func2], callback);
        });

    });

    describe('Тестирование функции \'parallel\'', () => {

        it('Должен вызывать коллбэк, если список функций пуст', () => {
            var callback = sinon.spy();

            test.parallel([], callback);
            expect(callback).to.have.been.calledOnce;
            expect(callback).to.have.been.calledWith(null, []);
        });

        it('Должен вызывать единственную функцию', (done) => {
            var func = generateFunction(1);
            var callback = sinon.spy(() => {
                expect(func).to.be.calledOnce;
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [1]);
                done();
            });

            test.parallel([func], callback);
        });

        it('Должен вызывать две функции', (done) => {
            var funcArray = [generateFunction(1), generateFunction(2)];
            var callback = sinon.spy(() => {
                funcArray.forEach((f) => expect(f).to.be.calledOnce);
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [1, 2]);
                done();
            });

            test.parallel(funcArray, callback);
        });

        it('Должен вызывать все три функции', (done) => {
            var funcArray = [];
            for (let i = 1; i <= 3; i++) {
                funcArray.push(generateFunction(i));
            }
            var callback = sinon.spy(() => {
                funcArray.forEach((f) => expect(f).to.be.calledOnce);
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [1, 2, 3]);
                done();
            });

            test.parallel(funcArray, callback);
        });

        it('Должен параллельно вызывать все три функции, если limit > 3', (done) => {
            var funcArray = [];
            for (let i = 1; i <= 3; i++) {
                funcArray.push(generateFunction(i));
            }
            var callback = sinon.spy(() => {
                funcArray.forEach((f) => expect(f).to.be.calledOnce);
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [1, 2, 3]);
                done();
            });

            test.parallel(funcArray, 5, callback);
        });


        it('Должен вызывать все 5 функций, если limit = 3', (done) => {
            var funcArray = [];
            for (let i = 1; i <= 5; i++) {
                funcArray.push(generateFunction(i));
            }
            var callback = sinon.spy(() => {
                funcArray.forEach((f) => expect(f).to.be.calledOnce);
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [1, 2, 3, 4, 5]);
                done();
            });

            test.parallel(funcArray, 3, callback);
        });

        it('Должен вызывать все три функции по порядку, т.к. задано ограничение в 1', (done) => {
            var func1 = sinon.spy((next) => {
                setTimeout(() => {
                    sinon.assert.notCalled(func2);
                    sinon.assert.notCalled(func3);
                    next(null, 1);
                }, 50);
            });
            var func2 = sinon.spy((next) => {
                setTimeout(() => {
                    sinon.assert.calledOnce(func1);
                    sinon.assert.notCalled(func3);
                    next(null, 2);
                }, 100);
            });
            var func3 = sinon.spy((next) => {
                setTimeout(() => {
                    sinon.assert.calledOnce(func1);
                    sinon.assert.calledOnce(func2);
                    next(null, 3);
                }, 30);
            });

            var callback = sinon.spy(() => {
                done();
            });

            test.parallel([func1, func2, func3], 1, callback);
        });

        it('Должен возвращать ошибку, если одна из функций вернула ошибку', (done) => {
            var funcArray = [];
            funcArray.push(generateFunction(1));
            funcArray.push(generateFunction('error'));
            funcArray.push(generateFunction(3));
            var callback = sinon.spy(() => {
                funcArray.forEach((f) => expect(f).to.be.calledOnce);
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith('error', [1, undefined, 3]);
                done();
            });

            test.parallel(funcArray, callback);
        });

        it('Должен вызывать все функции параллельно', (done) => {
            var a = Date.now();
            var funcArray = [];
            funcArray.push(generateFunction(1, 400));
            funcArray.push(generateFunction(2, 100));
            funcArray.push(generateFunction(3, 200));
            var callback = sinon.spy(() => {
                var b = Date.now();
                funcArray.forEach((f) => expect(f).to.be.calledOnce);
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [1, 2, 3]);
                assert.isBelow(b - a, 410);
                done();
            });

            test.parallel(funcArray, callback);
        });
    });

    describe('Тестирование функции \'map\'', () => {

        it('Должен вызывать коллбэк, если список элементов пуст', (done) => {
            var func = setTimeout(() => {}, 100);
            var callback = sinon.spy(() => {
                expect(callback).to.have.been.calledOnce;
                expect(callback).to.have.been.calledWith(null, []);
                done();
            });

            test.map([], func, callback);
        });


        it('Должен применять функцию к массиву значений', (done) => {
            var func = sinon.spy((value, next) => {
                setTimeout(() => next(null, value * 2), 100);
            });
            var callback = sinon.spy(() => {
                expect(func).to.be.calledThrice;
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [2, 4, 6]);
                done();
            });

            test.map([1, 2, 3], func, callback);
        });

        it('Должен вызывать функцию с каждым значением параллельно', (done) => {
            var a = Date.now();
            var func = sinon.spy((value, next) => {
                setTimeout(() => next(null, value * 2), 100);
            });
            var callback = sinon.spy(() => {
                var b = Date.now();
                expect(func).to.be.calledThrice;
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith(null, [2, 4, 6]);
                assert.isBelow(b - a, 110);
                done();
            });

            test.map([1, 2, 3], func, callback);
        });

        it('Должен возвращать ошибку, если одна из функций вернула ошибку', (done) => {
            var func = sinon.spy((value, next) => {
                setTimeout(() => {
                    if (value === 'error') {
                        next('error');
                    } else {
                        next(null, value * 2);
                    }
                }, 100);
            });
            var callback = sinon.spy(() => {
                expect(func).to.be.calledThrice;
                expect(callback).to.be.calledOnce;
                expect(callback).to.be.calledWith('error', [2, undefined, 6]);
                done();
            });

            test.map([1, 'error', 3], func, callback);
        });
    });

    describe('Тестирование функции \'makeAsync\'', () => {

        it('Полученную функцию можно использовать в serial', (done) => {

            var barsik = path.join(__dirname, '..', 'javascript-tasks-9', 'cats', 'barsik.json');

            var callback = (error, data) => {
                expect(error).to.be.equal(null);
                expect(data.name).to.be.equal('barsik');
                expect(data.price).to.be.equal(5000);
                done();
            };
            test.serial([
                (next) => fs.readFile(barsik, next),
                test.makeAsync(JSON.parse)
            ], callback);
        });

        it('Если функция выбрасывает исключение, то оно передаётся в качестве ошибки', (done) => {

            var e = new Error('Ошибка!');

            var callback = (error, data) => {
                expect(error).to.be.equal(e);
                expect(data).to.be.equal(undefined);
                done();
            };

            var func = sinon.spy(() => {
                throw e;
            });

            test.serial([test.makeAsync(func)], callback);
        });

        it('Полученную функцию можно использовать в serial первой', (done) => {

            var callback = (error, data) => {
                expect(error).to.be.equal(null);
                expect(data).to.be.equal(10);
                done();
            };

            var func1 = sinon.spy(() => {
                return 5;
            });
            var func2 = sinon.spy((a, next) => {
                setTimeout(() => next(null, a * 2), 200);
            });

            test.serial([test.makeAsync(func1), func2], callback);
        });
    });
});
