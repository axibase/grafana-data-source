import {parse} from 'grafana/app/core/utils/datemath';
import _ from 'lodash';

export function _convertToAtsdTime(date: any) {
  date = date !== 'now' ? date : new Date();
  date = parse(date);

  return date.toISOString();
}

export function _parsePeriod(period) {
  return {count: period.count, unit: period.unit};
}

export function _transformMetricData(metricData) {
  const dps = _.map(metricData.data, function(item) {
    return [item.v, item.t];
  });
  let name = metricData.entity + ': ' + metricData.metric;
  _.each(metricData.tags, (value, key) => {
    name += `, ${key}=${value}`;
  });
  return {target: name, datapoints: dps};
}

export function _convertToSeconds(interval) {
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
