import AtsdDatasource from './datasource';
import {AtsdQueryCtrl} from './query_ctrl';
import {ChangeMyNameConfigCtrl} from './config_ctrl';

class ChangeMyNameAnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html';
}

export {
  AtsdDatasource as Datasource,
  AtsdQueryCtrl as QueryCtrl,
  ChangeMyNameConfigCtrl as ConfigCtrl,
  ChangeMyNameAnnotationsQueryCtrl as AnnotationsQueryCtrl,
};
