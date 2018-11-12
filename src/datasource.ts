import _ from 'lodash';
import {_convertToAtsdTime, _convertToSeconds, _parsePeriod, _transformMetricData, convertTags} from './convertutils';
import {BackendSrv} from 'grafana/app/core/services/backend_srv';
import {AtsdClient, Entity} from './atsd_client';


export enum DatasourceType {
  ATSD, AS
}

export default class AtsdDatasource {

  private readonly client: AtsdClient;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv: BackendSrv, private templateSrv, private $q) {
    this.client = new AtsdClient(this.backendSrv, {
      proxyUrl: instanceSettings.url,
      basicAuth: instanceSettings.basicAuth,
    });
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

    return this.client.querySeries(tsQueries);
  }

  getEntities(): Promise<Array<Entity>> {
    return this.client.entities();
  }

  getMetrics(entity) {
    return this.client.metrics(entity);
  }

  getMetricSeries(metric) {
    return this.client.metricSeries(metric);
  }

  getVersion() {
    return this.client.version();
  }

  testDatasource() {
    return this.client.version().then(() => ({
      status: 'success',
      message: 'Data source is working',
      title: 'Success',
    }));
  }

  private _convertTargetToQuery(target) {
    if (!target.metric || !target.entity || target.hide) {
      return null;
    }
    return {
      entity: this.templateSrv.replace(target.entity),
      metric: this.templateSrv.replace(target.metric),
      aggregation: target.aggregation.type !== undefined ? target.aggregation : undefined,
      tags: convertTags(target.tags),
      disconnect:
        target.disconnect !== undefined && target.disconnect !== ''
          ? _convertToSeconds(_parsePeriod(target.disconnect))
          : 24 * 60 * 60,
    };
  }
}
