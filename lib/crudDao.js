"use strict";

const Promise = require('bluebird');
const _ = require('lodash');

function CrudDao () {
	if (!(this instanceof CrudDao)) {
		return new CrudDao(...arguments);
	}
	return this.Reload(...arguments);
}

CrudDao.prototype.Reload = function (tablename, ifs) {
	this.db = ifs.db;

	this.tablename = tablename;
};
CrudDao.prototype.getColInfo = function () {
	if (this.colInfoProm) {
		return this.colInfoProm;
	}
	this.colInfoProm = this.db(this.tablename).columnInfo();
	return this.colInfoProm;
};

CrudDao.prototype.now = function () {
	return this.db.raw("now()");
};

CrudDao.prototype.select = function (filters, orders, offset, limit) {
	if (limit == null || limit > 1000 || !Number.isInteger(limit)) {
		limit = 1000;
	}
	if (offset == null || !Number.isInteger(offset)) {
		offset = 0;
	}
	orders = orders || [];

	let ret = this.db.select("*").from(this.tablename).where(filters).limit(limit).offset(offset);

	for (const order of orders) {
		ret = ret.orderBy(order[0], order[1]);
	}
	// console.info(ret.toSQL().toNative());
	return Promise.resolve(ret);
};

CrudDao.prototype.create = function (values, returning) {
	return this.getColInfo().then(colInfo => {
		if ('createdat' in colInfo) {
			values.createdat = this.now();
		}
	}).then(() => {
		return this.db(this.tablename)
			.insert(values, returning || '*')
			.then(r => r[0]);// create is generally a single row insert for crud
	});
};

CrudDao.prototype.get = async function (filter) {
	let ret = await this.db.select("*").from(this.tablename).where(filter).limit(1);
	return ret[0] || null;
};

CrudDao.prototype.update = function (filter, values, returning) {
	return this.getColInfo().then(colInfo => {
		if ('updatedat' in colInfo) {
			values.updatedat = this.now();
		}
	}).then(() => {
		let ret = this.db(this.tablename).where(filter).update(values, returning);
		return ret;
	});
};

CrudDao.prototype.delete = function (filter) {
	let ret = this.db(this.tablename).where(filter).del();
	return Promise.resolve(ret);
};

CrudDao.prototype.getOrCreate = function (filter, values) {
	return Promise.try(() => {
		return this.get(filter);
	}).then(existing => {
		if (!existing) {
			return this.create(_.assign({}, filter, values));
			// create returns everything inserted...(?)
			// .then(() => this.get(filter));
		}
		return existing;
	});
};
CrudDao.prototype.updateOrCreate = function (filter, values) {
	return Promise.try(() => {
		return this.get(filter);
	}).then(existing => {
		if (!existing) {
			return this.create(_.assign({}, filter, values));
		}
		return this.update(filter, values);
	});
};

CrudDao.BuildAll = function (db) {
	let ret = {};
	// detect all tables
	return db.raw(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = current_schema()
			AND table_catalog = current_database() ;
	`).then(res => {
		return Promise.each(res.rows, row => {
			const tableName = row.table_name;
			// console.info('Make crud', tableName);
			ret[tableName] = new CrudDao(tableName, { db });
		});
	}).then(() => {
		return ret;
	});
};

module.exports = CrudDao;
