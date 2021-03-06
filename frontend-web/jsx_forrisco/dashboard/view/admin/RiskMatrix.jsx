import React from "react";
import LoadingGauge from "forpdi/jsx/core/widget/LoadingGauge.jsx";
import DashboardStore from "forpdi/jsx/dashboard/store/Dashboard.jsx";
import PolicyStore from "forpdi/jsx_forrisco/planning/store/Policy.jsx";
import UnitStore from "forpdi/jsx_forrisco/planning/store/Unit.jsx";
import RiskQuantity from "forpdi/jsx_forrisco/dashboard/view/admin/RiskQuantity.jsx";
import Messages from "forpdi/jsx/core/util/Messages.jsx";
import AttributeTypes from 'forpdi/jsx/planning/enum/AttributeTypes.json';
import Modal from "forpdi/jsx/core/widget/Modal.jsx";

var numeral = require('numeral');


export default React.createClass({

	getInitialState() {
		return {
			loading: true,
			opportunities: false,
			threats: true,
			policyModel: null,
			risklevelModel: null,
			policyId: null,
			currentRisks: null,
			impact: [],
			prb: [],
			risks: [],
			unit: -1,
			units: [],
			plan: null
		};
	},

	componentDidMount() {
		var me = this;
		if (EnvInfo && EnvInfo.company == null) {
			me.setState({
				loading: false
			});
		}

		PolicyStore.on("retrieverisklevel_", (model) => {
			me.setState({
				risklevelModel: model,
				loading: false
			});
			me.forceUpdate();
		}, me);

		PolicyStore.on("findpolicy", (model) => {
			if (model.success) {
				me.setState({
					policyModel: model.data,
				});
				PolicyStore.dispatch({
					action: PolicyStore.ACTION_RETRIEVE_RISK_LEVEL_,
					data: model.data.id
				});
			}
		}, me);
	},



	componentWillReceiveProps(newProps) {
		var me = this;

		this.state.plan = newProps.plan
		this.state.risks = newProps.risks
		this.state.units = newProps.units
		this.setState({
			plan: newProps.plan,
			risks: newProps.risks,
			units: newProps.units,
			loading: true,
			policyModel: null,
			risklevelModel: null,
			unit: -1
		});

		this.refresh()
	},

	refresh() {

		PolicyStore.dispatch({
			action: PolicyStore.ACTION_FIND_POLICY,
			data: this.state.plan.policyId
		});
	},

	componentWillUnmount() {
		DashboardStore.off(null, null, this);
		UnitStore.off(null, null, this);
		PolicyStore.off(null, null, this);
	},

	selectThreats() {
		this.setState({
			threats: true,
			opportunities: false,
		})
	},

	selectOpportunities() {
		this.setState({
			threats: false,
			opportunities: true,
		})
	},

	getRisks() {
		var risks = []

		if (this.state.unit == -1) {
			for (var i = 0; i < this.state.risks.length; i++) {
				if ((this.state.threats && this.state.risks[i].type.toLowerCase() == "ameaça")
					|| !this.state.threats && this.state.risks[i].type.toLowerCase() == "oportunidade") {
					risks.push(this.state.risks[i]);
				}
			}
		} else {
			for (var i = 0; i < this.state.risks.length; i++) {
				if (this.state.risks[i].unit.id == this.state.unit) {
					if ((this.state.threats && this.state.risks[i].type.toLowerCase() == "ameaça")
						|| !this.state.threats && this.state.risks[i].type.toLowerCase() == "oportunidade") {
						risks.push(this.state.risks[i]);
					}
				}
			}
			return risks;
		}

		return risks;
	},

	showRisk(probability, impact) {
		Modal.riskList(this.state.plan, this.state.unit, this.state.threats, probability, impact);
	},

	countRisks(risks, impact, probability, color) {
		var count = 0;
		for (var i = 0; i < risks.length; i++) {
			if (risks[i].impact == impact && risks[i].probability == probability) {
				risks[i].color = color
				count++;
			}
		}
		return count
	},
	getMatrixValue(risks, matrix, line, column) {
		var firstMatch = 0;
		for (var i = 0; i < matrix.length; i++) {
			if (matrix[i][1] == line) {
				if (matrix[i][2] == column) {
					if (matrix[i][2] == 0) {
						return <div title={matrix[i][0]} style={{ "textAlign": "center", "minWidth": "80px", "maxWidth": "80px", "marginRight": "20px"}}>{matrix[i][0]}</div>
					} else if (matrix[i][1] == this.state.policyModel.nline) {

						var imp= JSON.parse(JSON.stringify(matrix[i][0]))

						if(this.state.policyModel.ncolumn>2){
							var level = imp.split(" ");
							for(var j=0; j<level.length; j++){
								if(level[j].length>15){
									level[j]=level[j].substr(0, 13).concat("...")
								}
							}

							imp=""
							for(var j=0; j<level.length; j++){
								imp+=(level[j])

								if(j+1!=level.length){
									imp+="  "
								}
							}
						}

						return <div key={i} title={matrix[i][0]} className="matrix-impact-div" style={{ "whiteSpace" : "pre-line", "textAlign" : "-webkit-center", "padding" : "2px"}} id={"match" + firstMatch}>{imp}</div>
					} else {

						var current_color = -1;
						var color = ""
						if (this.state.risklevelModel != null) {
							for (var k = 0; k < this.state.risklevelModel.data.length; k++) {
								if (this.state.risklevelModel.data[k]['level'] == matrix[i][0]) {
									current_color = this.state.risklevelModel.data[k]['color']
								}
							}
						}
						switch (current_color) {
							case 0: color = "Vermelho"; break;
							case 1: color = "Marron"; break;
							case 2: color = "Amarelo"; break;
							case 3: color = "Laranja"; break;
							case 4: color = "Verde"; break;
							case 5: color = "Azul"; break;
							default: color = "Cinza";
						}
						var impact = matrix[this.state.policyModel.nline * (this.state.policyModel.ncolumn + 1) + column - 1][0]
						var probability = matrix[(line) * (this.state.policyModel.ncolumn + 1)][0];

						return (
							<div style={{"font-size" : "18px"}}className={"icon-link Cor dashboard " + color} onClick={() => this.showRisk(probability, impact)}>
								<b>{this.countRisks(risks, impact, probability, color)}</b>
							</div>
						)
					}
				}
			}
			firstMatch ++;
		}
		return ""
	},

	getMatrix() {
		if (this.state.policyModel == null) {
			return
		}

		this.state.currentRisks = this.getRisks();

		var fields = [];
		if (typeof this.state.fields === "undefined" || this.state.fields == null) {
			fields.push({
				name: "description",
				type: AttributeTypes.TEXT_AREA_FIELD,
				placeholder: "",
				maxLength: 9000,
				label: Messages.getEditable("label.description", "fpdi-nav-label"),
				value: this.state.itemModel ? this.state.itemModel.get("description") : null,
				edit: false
			});
		} else {
			fields = this.state.fields
		}

		var aux = this.state.policyModel.matrix.split(/;/);
		var matrix = [];

		for (var i = 0; i < aux.length; i++) {
			matrix[i] = new Array(3);
			matrix[i][0] = aux[i].split(/\[.*\]/)[1]; //prob / impacto
			matrix[i][1] = aux[i].match(/\[.*\]/)[0].substring(1, aux[i].match(/\[.*\]/)[0].length - 1).split(/,/)[0]; //linha
			matrix[i][2] = aux[i].match(/\[.*\]/)[0].substring(1, aux[i].match(/\[.*\]/)[0].length - 1).split(/,/)[1]; //coluna
		}

		var table = [];
		for (var i = 0; i <= this.state.policyModel.nline; i++) {
			var children = [];
			for (var j = 0; j <= this.state.policyModel.ncolumn; j++) {
				children.push(this.getMatrixValue(this.state.currentRisks, matrix, i, j))
			}

			if(children[0] === "") {
					table.push(
						<div className="matrix-impact-tr" key={i}>
							<div className="matrix-impact-td" key={j}>{children}</div>
						</div>
					)
			} else {
				table.push(
					<div className="matrix-tr" key={i}>
						<div className="matrix-td" key={j}>{children}</div>
					</div>
				)
			}
		}
		table.push()
		return (<div className="dashboard-matrix-container-inner">
					{table}
				</div>
		);
	},

	onUnitChange(evnt) {
		this.setState({
			unit: this.refs['selectUnits'].value
		})
	},

	render() {
		return (
			<div style={{ overflow: "hidden" }}>
				<div className="col-md-7">
					<div className="frisco-dashboard panel panel-default dashboard-goals-info-ctn">

						{/* select com todas as unidades deste plano de risco
						o plano de risco é uma propriedade da dashboardPanel */}

						<div className="panel-heading dashboard-panel-title">
							<b className="budget-graphic-title" title={Messages.get("label.risksMatrix")}>{Messages.get("label.risksMatrix").toUpperCase()}</b>
							<span className="frisco-containerSelect"> {Messages.get("label.units")}
								<select onChange={this.onUnitChange} className="form-control dashboard-select-box-graphs marginLeft10" ref="selectUnits">
									<option value={-1} data-placement="right" title={Messages.get("label.viewAll_")}> {Messages.get("label.viewAll_")} </option>
									{this.state.units.map((attr, idy) => {
										return (
											<option key={attr.id} value={attr.id} data-placement="right" title={attr.name}>
												{(attr.name.length > 20) ? ((attr.name).trim().substr(0, 20).concat("...").toString()) : (attr.name)}
											</option>
										);
									})
									}
								</select>
							</span>
						</div>

						<div className="frisco-containerOptions">
							<span className={this.state.threats ? "active" : ""} onClick={this.selectThreats}>{Messages.get("label.risk.threats")}</span>
							<span className={this.state.opportunities ? "active" : ""} onClick={this.selectOpportunities}>{Messages.get("label.risk.opportunities")}</span>
						</div>
						<br/>


						<div className="dashboard-matrix-container" style={{height: "362px"}}>
						{<div className="matrix-vertical-text dashboard">PROBABILIDADE</div>}
							{this.state.loading ? <LoadingGauge /> : this.getMatrix()}
						</div>
						<div style={{display: "flex", "justifyContent": "center", "fontWeight": "bold"}}>IMPACTO</div>

					</div>
				</div>
				{this.state.loading ? <LoadingGauge /> :
					<div className="col-md-5">
						<RiskQuantity
							plan={this.state.plan}
							risks={this.state.currentRisks}
							allRisks={this.state.risks}
							threats={this.state.threats}
							riskLevel={this.state.risklevelModel}
							unit={this.state.unit}
							units={this.state.units}
						/>
					</div>
				}
			</div>
		);
	}
});
