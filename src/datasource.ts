import angular from 'angular';
import _ from 'lodash';
import {_convertToAtsdTime, _convertToSeconds, _parsePeriod, _transformMetricData} from './convertutils';

export default class AtsdDatasource {
  private readonly url: string;
  private readonly basicAuth: string;

  constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    this.templateSrv = templateSrv;
    this.backendSrv = backendSrv;
  }

  query(options) {
    const start = _convertToAtsdTime(options.range.from);
    const end = _convertToAtsdTime(options.range.to);
    const qs: any[] = [];

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
      const result = response.data.map(_transformMetricData);
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
    const tsQueries: any[] = [];

    _.each(queries, query => {
      if (query.entity !== '' && query.metric !== '') {
        if (query.implicit) {
          if (query.tagCombos !== undefined) {
            _.each(query.tagCombos, group => {
              if (group.en) {
                const tags = {};

                _.each(group.data, (value, key) => {
                  tags[key] = [value];
                });

                tsQueries.push({
                  startDate: start,
                  endDate: end,
                  limit: 10000,
                  entity: query.entity,
                  metric: query.metric,
                  tags: tags,
                  timeFormat: 'milliseconds',
                  aggregate: query.aggregation,
                });
              }
            });
          }
        } else {
          const tags = {};

          for (const k in query.tags) {
            tags[k] = query.tags[k];
          }

          tsQueries.push({
            startDate: start,
            endDate: end,
            limit: 10000,
            entity: query.entity,
            metric: query.metric,
            tags: tags,
            timeFormat: 'milliseconds',
            aggregate: query.aggregation,
          });
        }
      }
    });

    if (tsQueries.length === 0) {
      const d = this.$q.defer();
      d.resolve({data: undefined});
      return d.promise;
    }

    const options = {
      method: 'POST',
      url: this.fullUrl('/api/v1/series/query'),
      data: tsQueries,
      headers: {
        Authorization: this.basicAuth,
      },
    };

    return this.backendSrv.datasourceRequest(options).then(result => result);
  }

  getEntities(params) {
    const options = {
      method: 'GET',
      url: this.fullUrl('/api/v1/entities'),
      params: params,
      headers: {
        Authorization: this.basicAuth,
      },
    };
    return this.httpRequest(options).then((result) => {
      return result.data;
    });
  }

  getMetrics(entity, params) {
    const options = {
      method: 'GET',
      url: this.fullUrl('/api/v1/entities/' + entity + '/metrics'),
      params: params,
      headers: {
        Authorization: this.basicAuth,
      },
    };
    return this.httpRequest(options).then((result) => {
      return result.data;
    });
  }

  getMetricSeries(metric, params) {
    const options = {
      method: 'GET',
      url: this.fullUrl('/api/v1/metrics/' + metric + '/series'),
      params: params,
      headers: {
        Authorization: this.basicAuth,
      },
    };
    return this.httpRequest(options).then(result => result.data);
  }

  testDatasource() {
    const options = {
      method: 'POST',
      url: this.fullUrl('/api/v1/series/query'),
      data: [],
      headers: {
        Authorization: this.basicAuth,
      },
    };
    return this.httpRequest(options).then(() => ({
      status: 'success',
      message: 'Data source is working',
      title: 'Success',
    }));
  }

  httpRequest(options) {
    if (!options.cache) {
      options.cache = true;
    }
    return this.backendSrv.datasourceRequest(options);
  }

  fullUrl(part) {
    const fullUrl = this.url[this.url.length - 1] !== '/' ? this.url + '/' : this.url;
    if (!(part.length <= 0 || part[0] !== '/')) {
      part = part.substr(1, part.length - 1);
    }
    return fullUrl + part;
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
      disconnect:
        target.disconnect !== undefined && target.disconnect !== ''
          ? _convertToSeconds(_parsePeriod(target.disconnect))
          : 24 * 60 * 60,
    };

    target.tags.forEach(item => {
      query.tags[item.key] = item.value;
    });

    return query;
  }
}
