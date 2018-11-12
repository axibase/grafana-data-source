import _ from 'lodash';
import {QueryCtrl} from 'grafana/app/plugins/sdk';

interface Suggestion {
  metrics: string[];
  entities: string[];
  tables: string[];
  aggregation: {
    types: any;
    period: {units: any};
  };
  tags: {
    keys: Array<any>;
    values: any[];
  };
}

interface State {
  isLoaded: boolean;
  showAggregation?: boolean;
  tagRow: {
    isEdit: boolean;
    canAdd: boolean;
    tags: any[];
  };
}

interface Segment {
  tagEditor: {
    editIndex: number | undefined;
    key: string | undefined;
    value: string | undefined;
  };
}

interface Metric {
  name: string;
}

export class AtsdQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';
  private suggest: Suggestion;
  private segments: Segment;
  private state: State;
  private model: any;

  /** @ngInject */
  constructor($scope, $injector) {
    super($scope, $injector);

    this.suggest = {
      metrics: [],
      entities: [],
      tables: [],
      aggregation: {
        types: AtsdQueryCtrl.aggregateOptions(),
        period: {
          units: AtsdQueryCtrl.unitOptions(),
        },
      },
      tags: {
        keys: [],
        values: [],
      },
    };

    this.segments = {
      tagEditor: {
        editIndex: undefined,
        key: undefined,
        value: undefined,
      },
    };

    this.state = {
      isLoaded: true,
      showAggregation: undefined,
      tagRow: {
        isEdit: false,
        canAdd: true,
        tags: [],
      },
    };

    this.model = {...this.target};
    this.model.table = undefined;
    this.model.metric = undefined;

    if (typeof this.model.tags !== 'object') {
      this.model.tags = [];
    } else {
      for (let i = 0; i < this.model.tags.length; i++) {
        this.state.tagRow.tags.push({selected: false});
      }
    }
    this.model.entity = this.model.entity ? this.model.entity : undefined;
    this.model.metric = this.model.metric ? this.model.metric : undefined;
    this.model.aggregation = this.model.aggregation
      ? this.model.aggregation
      : {
          type: this.suggest.aggregation.types[0].value,
          period: {
            count: 1,
            unit: this.suggest.aggregation.period.units[3].value,
          },
        };

    this.suggest.entities = [];
    this.datasource
      .getEntities()
      .then(result => {
        result.forEach(item => this.suggest.entities.push(item.name));
        this.state.isLoaded = false;
      })
      .catch(err => console.log(err));
    this.datasource.getVersion().then(v => {
      this.state.showAggregation = !!v.buildInfo.hbaseVersion;
      if (!this.state.showAggregation) {
        this.model.aggregation = {
          type: this.suggest.aggregation.types[0].value,
          period: {
            count: 1,
            unit: this.suggest.aggregation.period.units[3].value,
          },
        };
      }
      if (this.model.entity) {
        if (this.state.showAggregation) {
          this.model.metric = this.target.metric;
        } else {
          const commaPos = this.target.metric.indexOf(',');
          if (commaPos > -1) {
            this.model.table = this.target.metric.substr(0, commaPos);
            this.model.metric = this.target.metric.substr(commaPos + 1);
          } else {
            this.model.metric = this.target.metric;
          }
        }
        this.entityBlur();
      }
    });
  }

  refresh() {
    for (const k of Object.keys(this.model)) {
      this.target[k] = this.model[k];
    }
    this.target.metric =
      this.model.metric && this.model.table
        ? `${this.model.table},${this.model.metric}`
        : this.model.metric;
    super.refresh();
  }

  private static aggregateOptions() {
    const aggregateTypes = [
      undefined,
      'Count',
      'Min',
      'Max',
      'Avg',
      'Median',
      'Sum',
      'Percentile_999',
      'Percentile_995',
      'Percentile_99',
      'Percentile_95',
      'Percentile_90',
      'Percentile_75',
      'First',
      'Last',
      'Delta',
      'Wavg',
      'Wtavg',
      'Standard_deviation',
    ];
    return _.map(aggregateTypes, item =>
      item
        ? {
            label: item,
            value: item.toUpperCase(),
          }
        : {
            label: 'None',
            value: item,
          }
    );
  }

  private static unitOptions() {
    return [
      {
        label: 'MILLISECOND',
        value: 'MILLISECOND',
      },
      {
        label: 'SECOND',
        value: 'SECOND',
      },
      {
        label: 'MINUTE',
        value: 'MINUTE',
      },
      {
        label: 'HOUR',
        value: 'HOUR',
      },
      {
        label: 'DAY',
        value: 'DAY',
      },
      {
        label: 'WEEK',
        value: 'WEEK',
      },
      {
        label: 'MONTH',
        value: 'MONTH',
      },
      {
        label: 'QUARTER',
        value: 'QUARTER',
      },
      {
        label: 'YEAR',
        value: 'YEAR',
      },
    ];
  }

  entityBlur() {
    this.refresh();
    if (this.model.entity) {
      if (this.state.showAggregation !== undefined) {
        if (this.state.showAggregation) {
        } else {
          this.datasource.getTables(this.model.entity).then(tables => {
            this.suggest.tables = tables.map(t => t.name);
            this.suggest.metrics = [];
          });
        }
        this.fetchSuggestMetric();
      }
    }
  }

  private fetchSuggestMetric() {
    this.datasource
      .getMetrics(this.model.entity, this.model.table)
      .then((result: Array<Metric>) => {
        this.suggest.metrics = result.map(m => m.name);
        if (this.state.showAggregation === false && this.model.table) {
          this.suggest.metrics = this.suggest.metrics.map(name =>
            name.substr(this.model.table.length + 1)
          );
        }
      });
  }

  tableBlur() {
    this.fetchSuggestMetric();
    this.refresh();
    this.suggestTags();
  }

  metricBlur() {
    this.refresh();
    this.suggestTags();
  }

  tagRemove(index) {
    this.model.tags.splice(index, 1);
    this.segments.tagEditor.editIndex = undefined;
    this.refresh();
  }

  tagEdit(index) {
    this.segments.tagEditor.editIndex = index;
    this.segments.tagEditor.key = this.model.tags[index].key;
    this.segments.tagEditor.value = this.model.tags[index].value;
    this.state.tagRow.tags[index].isEdit = true;
    this.state.tagRow.isEdit = true;
    this.state.tagRow.isEdit = true;
  }

  tagMouseover(index) {
    if (!this.state.tagRow.isEdit) {
      this.state.tagRow.tags[index].selected = true;
    }
  }

  tagMouseleave(index) {
    if (!this.state.tagRow.isEdit) {
      this.state.tagRow.tags[index].selected = false;
    }
  }

  saveTag() {
    const editorValue = {
      key: this.segments.tagEditor.key,
      value: this.segments.tagEditor.value,
    };
    const index = this.segments.tagEditor.editIndex;
    if (typeof index !== 'undefined') {
      this.model.tags[index] = editorValue;
    } else {
      this.model.tags.push(editorValue);
      this.state.tagRow.tags.push({selected: false});
    }
    if (typeof this.segments.tagEditor.editIndex !== 'undefined') {
      this.state.tagRow.tags[this.segments.tagEditor.editIndex].selected = false;
    }
    this.state.tagRow.isEdit = false;
    this.state.tagRow.canAdd = true;
    this.segments.tagEditor.key = '';
    this.segments.tagEditor.value = '';
    this.refresh();
  }

  removeAllTags() {
    this.closeTagEditor();
    this.model.tags.length = 0;
    this.refresh();
  }

  showTagEditor(index) {
    if (typeof index !== 'undefined') {
      this.segments.tagEditor.key = this.model.tags[index].key;
      this.segments.tagEditor.value = this.model.tags[index].value;
      this.state.tagRow.tags[index].isEdit = true;
    }
    this.segments.tagEditor.editIndex = index;
    this.state.tagRow.isEdit = true;
    this.state.tagRow.canAdd = false;
    this.state.tagRow.isEdit = true;
    this.suggestTags();
  }

  closeTagEditor() {
    if (typeof this.segments.tagEditor.editIndex !== 'undefined') {
      this.state.tagRow.tags[this.segments.tagEditor.editIndex].selected = false;
    }
    this.state.tagRow.isEdit = false;
    this.state.tagRow.canAdd = true;
    this.segments.tagEditor.key = '';
    this.segments.tagEditor.value = '';
  }

  suggestTags() {
    if (this.model.metric) {
      const params = {
        entity: undefined,
      };
      if (this.model.entity) {
        params.entity = this.model.entity;
      }
      this.datasource.getMetricSeries(this.model.metric).then(series => {
        this.suggest.tags.keys.length = 0;
        this.suggest.tags.values.length = 0;
        series.forEach(item => {
          for (const key in item.tags) {
            if (this.suggest.tags.keys.indexOf(key) === -1) {
              this.suggest.tags.keys.push(key);
            }
            const value = item.tags[key];
            if (this.suggest.tags.values.indexOf(value) === -1) {
              if (this.segments.tagEditor.key) {
                if (
                  key === this.segments.tagEditor.key &&
                  item.metric === this.model.metric &&
                  item.entity === this.model.entity
                ) {
                  this.suggest.tags.values.push(value);
                }
              } else {
                this.suggest.tags.values.push(value);
              }
            }
          }
        });
      });
    }
  }
}
