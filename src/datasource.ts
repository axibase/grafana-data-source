///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import angular from "angular";
import {parse} from "app/core/utils/datemath";
import _ from "lodash";

export default class AtsdDatasource {
    private type: string;
    private url: string;
    private basicAuth: string;
    private name: string;
    private cache: number;


    constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
        this.type = 'atsd';
        this.url = instanceSettings.url;
        this.basicAuth = instanceSettings.basicAuth;
        this.name = instanceSettings.name;
        this.templateSrv = templateSrv;
        this.backendSrv = backendSrv;
        this.cache = 300000;
        console.log(backendSrv);
    }

    query(options) {
        const start = AtsdDatasource._convertToAtsdTime(options.range.from);
        const end = AtsdDatasource._convertToAtsdTime(options.range.to);
        const qs = [];

        _.each(options.targets, target => {
            target.disconnect = options.targets[0].disconnect;
            qs.push(this._convertTargetToQuery(target));
        });

        const queries = _.compact(qs);

        if (_.isEmpty(queries)) {
            const d = this.$q.defer();
            d.resolve({data: []});
            return d.promise;
        }

        const groupByTags = {};

        _.each(queries, query => {
            _.each(query.tags, (val, key) => {
                groupByTags[key] = true;
            });
        });

        return this._performTimeSeriesQuery(queries, start, end).then(response => {
            if (response.data === undefined) {
                return {data: []};
            }

            const disconnect = queries[0].disconnect;

            const result = _.map(response.data,
                metricData => AtsdDatasource._transformMetricData(metricData));

            result.sort((a, b) => {
                const nameA = a.target.toLowerCase();
                const nameB = b.target.toLowerCase();

                if (nameA < nameB) {
                    return -1;
                } else if (nameA > nameB) {
                    return 1;
                } else {
                    return 0;
                }
            });

            return {data: result};
        });
    }

    private _performTimeSeriesQuery(queries, start, end) {
        var tsQueries = [];

        _.each(queries, query => {
            if (query.entity !== '' && query.metric !== '') {
                if (query.implicit) {
                    if (query.tagCombos !== undefined) {
                        _.each(query.tagCombos, group => {
                            if (group.en) {
                                var tags = {};

                                _.each(group.data, (value, key) => {
                                    tags[key] = [value];
                                });

                                tsQueries.push(
                                    {
                                        startDate: start,
                                        endDate: end,
                                        limit: 10000,
                                        entity: query.entity,
                                        metric: query.metric,
                                        tags: tags,
                                        timeFormat: 'milliseconds',
                                        aggregate: query.aggregation
                                    }
                                );
                            }
                        });
                    }
                } else {
                    const tags = {};

                    _.each(query.tags, (value, key) => {
                        tags[key] = [value];
                    });

                    tsQueries.push(
                        {
                            startDate: start,
                            endDate: end,
                            limit: 10000,
                            entity: query.entity,
                            metric: query.metric,
                            tags: tags,
                            timeFormat: 'milliseconds',
                            aggregate: query.aggregation
                        }
                    );
                }
            }
        });

        if (tsQueries.length === 0) {
            const d = this.$q.defer();
            d.resolve({data: undefined});
            return d.promise;
        }

        console.log('queries: ' + JSON.stringify(tsQueries));

        var options = {
            method: 'POST',
            url: this.fullUrl('/api/v1/series/query'),
            data: tsQueries,
            headers: {
                Authorization: this.basicAuth
            }
        };

        return this.backendSrv.datasourceRequest(options)
            .then(result => result);
    }

    getEntities(params) {
        const options = {
            method: 'GET',
            url: this.fullUrl('/api/v1/entities'),
            params: params,
            headers: {
                Authorization: this.basicAuth
            }
        };
        return this.httpRequest(options).then((result, err) => {
            if (err) {
                console.log(err);
            }
            console.log(result);
            return result.data;
        });
    }

    getMetrics(entity, params) {
        const options = {
            method: 'GET',
            url: this.fullUrl('/api/v1/entities/' + entity + '/metrics'),
            params: params,
            headers: {
                Authorization: this.basicAuth
            }
        };
        return this.httpRequest(options).then((result, err) => {
            if (err) {
                console.log(err);
            }
            console.log(result);
            return result.data;
        });
    }

    getMetricSeries(metric, params) {
        const options = {
            method: 'GET',
            url: this.fullUrl('/api/v1/metrics/' + metric + '/series'),
            params: params,
            headers: {
                Authorization: this.basicAuth
            }
        };
        return this.httpRequest(options).then(result => result.data);
    }

    testDatasource() {
        const options = {
            method: 'POST',
            url: this.fullUrl('/api/v1/series/query'),
            data: [],
            headers: {
                Authorization: this.basicAuth
            }
        };
        console.log(options);
        return this.httpRequest(options)
            .then(() => ({status: "success", message: "Data source is working", title: "Success"}));
    }


    httpRequest(options) {
        if (!options.cache) {
            options.cache = true;
        }
        return this.backendSrv.datasourceRequest(options);
    }

    fullUrl(part) {
        const fullUrl = (this.url[this.url.length - 1] !== '/') ? this.url + '/' : this.url;
        if (!(part.length <= 0 || part[0] !== '/')) {
            part = part.substr(1, part.length - 1);
        }
        console.log(fullUrl);
        return fullUrl + part;
    }


    private static _transformMetricData(metricData) {
        const dps = _.map(metricData.data, function (item) {
            return [item.v, item.t];
        });
        let name = metricData.entity + ': ' + metricData.metric;
        _.each(metricData.tags, (value, key) => {
            name += `, ${key}=${value}`;
        });
        return {target: name, datapoints: dps};
    }

    private static _parsePeriod(period) {
        return {count: period.count, unit: period.unit};
    }


    private static _convertToSeconds(interval) {
        let count = interval.count;

        switch (interval.unit) {
            case 'YEAR':
                count *= 365 * 24 * 60 * 60;
                break;
            case 'MONTH':
                count *= 30 * 24 * 60 * 60;
                break;
            case 'WEEK':
                count *= 7 * 24 * 60 * 60;
                break;
            case 'DAY':
                count *= 24 * 60 * 60;
                break;
            case 'HOUR':
                count *= 60 * 60;
                break;
            case 'MINUTE':
                count *= 60;
                break;
            case 'SECOND':
                break;
            default:
                count = 0;
        }

        return count;
    }

    private _convertTargetToQuery(target) {
        if (!target.metric || !target.entity || target.hide) {
            return null;
        }

        const query = {
            entity: this.templateSrv.replace(target.entity),
            metric: this.templateSrv.replace(target.metric),

            aggregation: target.aggregation.type !== undefined ? target.aggregation : undefined,
            tagCombos: angular.copy(target.tagCombos),
            implicit: angular.copy(target.implicit),
            tags: {},
            disconnect: (target.disconnect !== undefined && target.disconnect !== '') ?
                AtsdDatasource._convertToSeconds(AtsdDatasource._parsePeriod(target.disconnect)) :
                24 * 60 * 60
        };

        target.tags.forEach(item => {
            query.tags[item.key] = item.value;
        });

        return query;
    }

    private static _convertToAtsdTime(date) {
        date = date !== 'now' ? date : new Date();
        date = parse(date);

        return date.toISOString();
    }
}
