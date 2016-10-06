# Grafana Datasource plugin for Axibase Time Series Database

[Axibase Time Series Database](http://axibase.com/products/axibase-time-series-database/) makes it easy and convenient to store time series data at scale. It provides Network API, REST API, SQL query and other capabilities to analyze and visualize raw numeric observations both via a built-in visualization library as well as via widely-used external dashboarding tools such as [Grafana](http://grafana.org/).

### Requirements

* ATSD 14000+
* Grafana 3+

### Installation

*  Clone this repository into Grafana plugin folder (`default`: `/var/lib/grafana/plugins`)

```bash
sudo git clone https://github.com/axibase/grafana-data-source.git /var/lib/grafana/plugins/atsd
```

* Restart Grafana

```bash
sudo service grafana-server restart
```

### Verify Installation
 
 * Go to Grafana UI.
 * Open Menu -> Plugins.
 * Select datasource type
 * Select Axibase Time Series Database datasource
 
![](https://raw.githubusercontent.com/axibase/grafana-data-source/master/img/grafana-plugins-datasource-page.png)

### Examples

| <ul> <li>Tabular View</li><li>Tag Selector</li><li>2-Hour Aggregation</li></ul> | <ul> <li>Entity Wildcard</li> <li>All Tags</li></ul> | <ul> <li>Tag Selector</li> <li>Multiple Tags</li> <li>Tag Auto-complete</li></ul> |
| ------ | ------ | ----- |
| ![](https://raw.githubusercontent.com/axibase/grafana-data-source/master/img/examples/example2.png) | ![](https://raw.githubusercontent.com/axibase/grafana-data-source/master/img/examples/example3.png) | ![](https://raw.githubusercontent.com/axibase/grafana-data-source/master/img/examples/example4.png) |
