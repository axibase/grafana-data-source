import _ from 'lodash';
import {QueryCtrl} from 'grafana/app/plugins/sdk';

interface Suggestion {
  metrics: string[];
  entities: string[];
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

  /** @ngInject */
  constructor($scope, $injector) {
    super($scope, $injector);

    this.suggest = {
      metrics: [],
      entities: [],
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
      tagRow: {
        isEdit: false,
        canAdd: true,
        tags: [],
      },
    };

    if (this.target.entity) {
      this.entityBlur();
    }

    if (typeof this.target.tags !== 'object') {
      this.target.tags = [];
    } else {
      for (let i = 0; i < this.target.tags.length; i++) {
        this.state.tagRow.tags.push({selected: false});
      }
    }
    this.target.entity = this.target.entity ? this.target.entity : undefined;
    this.target.metric = this.target.metric ? this.target.metric : undefined;
    this.target.aggregation = this.target.aggregation
      ? this.target.aggregation
      : {
          type: this.suggest.aggregation.types[0].value,
          period: {
            count: 1,
            unit: this.suggest.aggregation.period.units[3].value,
          },
        };

    this.suggest.entities = [];
    this.datasource
      .getEntities({})
      .then(result => {
        result.forEach(item => this.suggest.entities.push(item.name));
        this.state.isLoaded = false;
      })
      .catch(() => console.log('Failed to retrieve entities'));
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
    if (this.target.entity) {
      this.datasource.getMetrics(this.target.entity, {}).then((result: Array<Metric>) => {
        this.suggest.metrics = [];
        if (result instanceof Array) {
          result.forEach(item => {
            this.suggest.metrics.push(item.name);
          });
        }
      });
    }
  }

  metricBlur() {
    this.refresh();
    this.suggestTags();
  }

  tagRemove(index) {
    this.target.tags.splice(index, 1);
    this.segments.tagEditor.editIndex = undefined;
    this.refresh();
  }

  tagEdit(index) {
    this.segments.tagEditor.editIndex = index;
    this.segments.tagEditor.key = this.target.tags[index].key;
    this.segments.tagEditor.value = this.target.tags[index].value;
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
    var editorValue = {
      key: this.segments.tagEditor.key,
      value: this.segments.tagEditor.value,
    };
    var index = this.segments.tagEditor.editIndex;
    if (typeof index !== 'undefined') {
      this.target.tags[index] = editorValue;
    } else {
      this.target.tags.push(editorValue);
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
    this.target.tags.length = 0;
    this.refresh();
  }

  showTagEditor(index) {
    if (typeof index !== 'undefined') {
      this.segments.tagEditor.key = this.target.tags[index].key;
      this.segments.tagEditor.value = this.target.tags[index].value;
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
    if (this.target.metric) {
      const params = {
        entity: undefined,
      };
      if (this.target.entity) {
        params.entity = this.target.entity;
      }
      this.datasource.getMetricSeries(this.target.metric, params).then(series => {
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
                  item.metric === this.target.metric &&
                  item.entity === this.target.entity
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
