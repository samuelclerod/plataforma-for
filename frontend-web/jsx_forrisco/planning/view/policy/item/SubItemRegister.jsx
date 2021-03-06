import _ from 'underscore';
import React from "react";
import { Link, hashHistory } from "react-router";

import ItemStore from "forpdi/jsx_forrisco/planning/store/Item.jsx";
import Form from "forpdi/jsx/planning/widget/attributeForm/AttributeForm.jsx";
import LoadingGauge from "forpdi/jsx/core/widget/LoadingGauge.jsx";
import Modal from "forpdi/jsx/core/widget/Modal.jsx";
import Messages from "forpdi/jsx/core/util/Messages.jsx";
import AttributeTypes from 'forpdi/jsx/planning/enum/AttributeTypes.json';
import PermissionsTypes from "forpdi/jsx/planning/enum/PermissionsTypes.json";
import Validation from 'forpdi/jsx_forrisco/core/util/Validation.jsx';
import AttributeInput from 'forpdi/jsx/planning/widget/attributeForm/AttributeInput.jsx';
import FieldItemInput from  'forpdi/jsx_forrisco/planning/view/item/FieldItemInput.jsx'


var VerticalForm = Form.VerticalForm;
var Validate = Validation.validate;


export default React.createClass({
	contextTypes: {
		roles: React.PropTypes.object.isRequired,
		router: React.PropTypes.object,
		toastr: React.PropTypes.object.isRequired,
		permissions: React.PropTypes.array.isRequired,
		tabPanel: React.PropTypes.object,
		policy: React.PropTypes.object.isRequired,
		item: React.PropTypes.object.isRequired,
		itemId: React.PropTypes.object.isRequired
	},
	getInitialState() {
		return {
			loading: true,
			itemModel: null,
			subitemModel:null,
			subFields: [],
			title: Messages.getEditable("label.newSubitem","fpdi-nav-label"),
			vizualization: false,
			tabPath: this.props.location.pathname,
			undeletable: false,
			newField: false,
			newFieldType: null,
			cancelLabel: "Cancelar",
			submitLabel: "Salvar",
			hasPendindField: false,
			fields: [],
			length: 0
		};
	},
	getField() {
		var fields;
		fields= {
			name: "description",
			type: AttributeTypes.TEXT_FIELD,
			placeholder: "Título do subitem",
			maxLength: 100,
			label: "Título",
			value:  this.state.subitemModel != null ? this.state.subitemModel.data.name:null,
			edit:false
		}

		return fields;
	},

	getInfo() {
		var fields = [];

		if(typeof this.state.fields === "undefined" || this.state.fields == null){
			fields.push({
				name: "description",
				type: AttributeTypes.TEXT_AREA_FIELD,
				placeholder: "",
				maxLength: 1000,
				label: Messages.getEditable("label.description","fpdi-nav-label"),
				value: this.state.subitemModel ? this.state.subitemModel.attributes.name : null,
				edit:false
			});
		}else{
			this.state.fields.map((fieldsubitem, index) => {
				fields.push(fieldsubitem)
			})
		}
		return fields;
	},

	/*
	subitem-Model
	subitem-new
	subitem-Deleted
	subitem-Updated

	item-Model

	subitemfields-Model
	*/
	componentDidMount() {
		var me = this;
		ItemStore.on("retrieveSubitem", (model) => {

			var fields = [];
			if(!model.data.deleted){
				if(model.data.fieldSubItem != null){


					for (var i in model.data.fieldSubItem) {
						var subitem=model.data.fieldSubItem[i]

						if(!subitem.deleted){
							fields.push({
								name: subitem.name+"-"+(i),
								value: subitem.name,
								label: subitem.name,
								description:subitem.description,
								isText:  subitem.isText,
								type: subitem.isText ? AttributeTypes.TEXT_AREA_FIELD : AttributeTypes.ATTACHMENT_FIELD,
								edit: false
							});
						}
					}
				}

				me.setState({
					subitemModel: model,
					vizualization: true,
					title: model.data.name,
					fields: fields,
					loading: this.state.itemModel == null
				});
				me.forceUpdate();
				_.defer(() => {this.context.tabPanel.addTab(this.props.location.pathname, model.data.name);});
			}
		}, me);

		ItemStore.on("subitemUpdated", (model) => {
			if(model !=null){
				var mod = this.state.subitemModel;
				mod.data.name = model.data.name;
				mod.data.description = model.data.description;
				mod.data.policy = model.data.policy;

				for (var i in model.data) {
					if(!model.data[i].deleted){
						var fields = [];

						fields.push({
							name: model.data[i].name,
							description: model.data[i].description,
							isText:  model.data[i].isText,
							type: model.data[i].isText? AttributeTypes.TEXT_AREA_FIELD : AttributeTypes.ATTACHMENT_FIELD,
							value: model.data[i].description,
							label: model.data[i].name,
							edit: false
						});
					}
				}

				me.setState({
					//fields: fields,
					subitemModel: mod,
					title: model.data.name,
					vizualization: true,
					fields: me.getInfo()
				});
				me.forceUpdate();

				me.context.toastr.addAlertSuccess(Messages.get("label.successUpdatedItem"));
				//this.context.router.push("/forrisco/policy/"+this.state.policyModel.attributes.id+"/item/"+model.data.id);

			}else{
				me.context.toastr.addAlertError(Messages.get("label.errorUpdatedItem"));
			}
		}, me);

		ItemStore.on("retrieveItem", (model) => {
			if(!model.attributes.deleted){
				me.setState({
					itemModel: model,
					loading: false //this.state.subitemModel == null
				});

			}else{
				me.setState({
					itemModel: null,
				});
			}
		}, me);


		ItemStore.on("newSubItem", (itemModel) => {
			if (this.state.fields.length === 0) {
				this.context.router.push("/forrisco/policy/"+this.props.params.policyId+"/item/"+this.state.itemModel.attributes.id+"/subitem/"+itemModel.data.id);
			} else {
				this.state.fields.map((fieldsubitem, index) => {
					ItemStore.dispatch({
						action: ItemStore.ACTION_CREATE_SUBFIELD,
						data:{
							subitem: itemModel.data,
							name: fieldsubitem.value,
							isText: fieldsubitem.type == AttributeTypes.TEXT_AREA_FIELD ? true : false,
							description: fieldsubitem.description,
							fileLink: fieldsubitem.fileLink
						}
					})
				});

				ItemStore.on("itemField", fieldModel => {
					this.context.router.push("/forrisco/policy/"+this.props.params.policyId+"/item/"+this.state.itemModel.attributes.id+"/subitem/"+itemModel.data.id);
				});
			}
		}, me);

		ItemStore.on("subitemDeleted", (model) => {
			this.context.router.push("forrisco/policy/"+this.props.params.policyId+"/item/"+this.state.itemModel.attributes.id);
		})

		me.refreshData(me.props, me.context);
	},


	componentWillUnmount() {
		ItemStore.off(null, null, this);
	},

	componentWillReceiveProps(newProps, newContext) {
		if (newProps.params.subitemId != this.props.params.subitemId) {
			this.setState({
				loading: true,
				fields: [],
				tabPath: newProps.location.pathname,
				vizualization: false,

				newField: false,
				newFieldType: null,
				itemModel: null,
				subitemModel: null,
				subfields:[],
				description: null,
				fileData: null,
				title: Messages.getEditable("label.newSubitem","fpdi-nav-label")
			});
			this.refreshData(newProps, newContext);
		}

	},
	refreshData(props, context) {
		if(props.params.policyId){
			if(props.params.subitemId){
				if(props.route.path !='new'){
					ItemStore.dispatch({
						action: ItemStore.ACTION_RETRIEVE_SUBITEM,
						data: props.params.subitemId
					});
				}
			}else{
				_.defer(() => {this.context.tabPanel.addTab(this.props.location.pathname, this.state.title);});

				this.setState({
					loading: false
				});
			}

			if(props.params.itemId){
				ItemStore.dispatch({
					action: ItemStore.ACTION_RETRIEVE_ITEM,
					data: props.params.itemId
				})
			}
		} else {
			this.setState({
				title: Messages.getEditable("label.newItem","fpdi-nav-label"),
				vizualization: false
			});
		}
	},


	refreshCancel () {
		Modal.hide();
	},
	onCancel() {
		if (this.state.subitemModel) {
			this.setState({
				vizualization: true,
				hasPendindField:false,
			});
		} else {
			this.context.tabPanel.removeTabByPath(this.props.location.pathname);
		}
	},
	changeVizualization() {
		this.state.fields.map( (fieldsubitem, i) => {
			fieldsubitem.edit=false
		})
		this.setState({
			vizualization: false,
		});
	},
	deleteSubitem() {
		var me = this;
		if (me.state.subitemModel != null) {
			var msg = "Você tem certeza que deseja excluir esse subitem?"
				Modal.confirmCustom(() => {
					Modal.hide();
					ItemStore.dispatch({
						action: ItemStore.ACTION_DELETE_SUB,
						data: me.state.subitemModel.data.id
					});
				},msg,me.refreshCancel);
		}
	},
	tweakNewField() {
		this.state.fields.map( (fieldsubitem, i) => {
			fieldsubitem.edit=false
		})
		this.setState({
			newField: !this.state.newField,
			newFieldType: null
		});
	},
	reset(){
		this.setState({
			newField: false,
			newFieldType: null,
			description: null,
			fileData: null,
			hasPendindField:false,
		});
	},
	getLength(){
		return this.state.length++
	},
	editFunc(id,bool){
		this.state.fields.map( (fieldsubitem, i) => {
			if (id==i){
				fieldsubitem.edit=bool
			}else{
				fieldsubitem.edit=false
			}
		})

		this.setState({
			fields: this.state.fields,
			newField:false,
			hasPendindField: false,
		})
	},
	deleteFunc(id){
		Modal.confirmCustom(() => {
			Modal.hide();
			this.state.fields.map( (fieldsubitem, index) => {
				if (id==index){
					this.state.fields.splice(index,1)
				}
			})
			this.setState({
				fields: this.state.fields,
				hasPendindField: false,
			})
		}, Messages.get("label.msg.deleteField"),()=>{Modal.hide()});
	},
	setItem(index,item){
		this.state.fields.map( (fieldsubitem, i) => {
			if (index==i){
				fieldsubitem.name= item.name,
				fieldsubitem.type= item.type,
				fieldsubitem.label= item.label,
				fieldsubitem.value= item.value,
				fieldsubitem.description= item.description,
				fieldsubitem.isText= item.isText,
				fieldsubitem.edit=false
			}
		})
		this.setState({
			fields: this.state.fields
		})
	},
	cancelWrapper(evt) {
		evt.preventDefault();
		for (var i = 0; i < this.getField().length; i++) {
			if (this.refs[this.getField().name])
				this.refs[this.getField().name].refs.formAlertError.innerHTML = "";
		}

		this.onCancel()
		this.context.router.push("/forrisco/policy/" + this.props.params.policyId + "/item/"+this.props.params.itemId+"/subitem/"+this.props.params.subitemId);
	},
	backWrapper() {
		hashHistory.goBack();
	},

	renderArchivePolicy() {
		return (
			<ul className="dropdown-menu">
				<li>
					<a onClick={this.deleteLevelAttribute}>
						<span className="mdi mdi-pencil disabledIcon" title={Messages.get("label.title.unableArchivedPlan")}>
							<span id="menu-levels">	{Messages.getEditable("label.title.unableArchivedPlan","fpdi-nav-label")} </span>
						</span>
					</a>
				</li>
			</ul>
		);

	},

	renderUnarchivePolicy() {
		return (
			<ul id="level-menu" className="dropdown-menu">
				<li>
					<Link
						to={"/forrisco/policy/"+this.context.policy.id+"/item/"+this.props.params.itemId+"/subitem/"+this.state.subitemModel.data.id}
						onClick={this.changeVizualization}>
						<span className="mdi mdi-pencil cursorPointer" title={Messages.get("label.title.editInformation")}>
							<span id="menu-levels"> {Messages.getEditable("label.title.editInformation","fpdi-nav-label")} </span>
						</span>
					</Link>
		         </li>
		         {this.state.undeletable ?
		         <li>
					<Link
						to={"/forrisco/policy/"+this.context.policy.id+"/item/"+this.props.params.itemId+"/subitem/"+this.state.subitemModel.data.id}>
						<span className="mdi mdi-delete disabledIcon cursorPointer" title={Messages.get("label.notDeletedHasChild")}>
							<span id="menu-levels"> {Messages.getEditable("label.deleteSubitem","fpdi-nav-label")}</span>
						</span>
					</Link>
		         </li>
		         :
		         <li>
					<Link
						to={"/forrisco/policy/"+this.context.policy.id+"/item/"+this.props.params.itemId+"/subitem/"+this.state.subitemModel.data.id}
						onClick={this.deleteSubitem}>
						<span className="mdi mdi-delete cursorPointer" title={Messages.get("label.deleteSubitem")}>
							<span id="menu-levels"> {Messages.getEditable("label.deleteSubitem","fpdi-nav-label")} </span>
						</span>
					</Link>
		         </li>
		     	}

			</ul>
		);
	},

	renderBreadcrumb() {
		return(
			<div>
				<span>
					<Link className="fpdi-breadcrumb fpdi-breadcrumbDivisor"
						to={'/forrisco/policy/'+this.context.policy.id}
						title={this.context.policy.name}>{this.context.policy.name.length > 15 ? this.context.policy.name.substring(0, 15)+"..." : this.context.policy.name.substring(0, 15)
					}</Link>
					<span className="mdi mdi-chevron-right fpdi-breadcrumbDivisor"></span>
				</span>

				<span>
					<Link className="fpdi-breadcrumb fpdi-breadcrumbDivisor"
						to={'/forrisco/policy/'+this.context.policy.id+"/item/"+this.props.params.itemId}
						title={this.state.itemModel.attributes.name}>{this.state.itemModel.attributes.name.length > 15 ? this.state.itemModel.attributes.name.substring(0, 15)+"..." : this.state.itemModel.attributes.name.substring(0, 15)
					}</Link>
					<span className="mdi mdi-chevron-right fpdi-breadcrumbDivisor"></span>
				</span>

				<span className="fpdi-breadcrumb fpdi-selectedOnBreadcrumb">
					{this.state.title > 15 ? this.state.title.substring(0, 15)+"..." : this.state.title.substring(0, 15)}
				</span>
			</div>
		);
	},

	onSubmit(event) {
		event && event.preventDefault();

		// confirma se ha algum campo de edição ou cadastro de novo item aberto
		const editingFields = _.filter(this.state.fields, field => field.edit);
		if (this.state.newField || editingFields.length > 0) {
			const msg = this.state.newField
				? 'As alterações inseridas no novo campo ainda não foram confirmadas. Confirme-as primeiro para salvar a edição'
				: 'As alterações feitas ainda não foram confirmadas. Confirme-as primeiro para salvar a edição';
			Modal.alert(() => {
				Modal.hide();
			}, msg);
			this.setState({
				hasPendindField: true,
			});
			return;
		}

		if(this.state.subitemModel){
			ItemStore.dispatch({
				action: ItemStore.ACTION_CUSTOM_UPDATE_SUB,
				data: {
					id: this.state.subitemModel.data.id,
					name: this.refs.newSubitemForm['field-description'].value,//this.state.subitemModel.data.name,
					item: this.state.itemModel,
					fieldSubItem: this.state.fields
				}
			});
		} else {
			var validation = Validate.validationNewItem(this.refs.newSubitemForm);

			if (validation.errorField) {
				this.context.toastr.addAlertError(Messages.get("label.error.form"));
			} else {

				ItemStore.dispatch({
					action: ItemStore.ACTION_NEW_SUBITEM,
					data: {
						name: validation.titulo.s,
						description: "",
						item: this.state.itemModel
						}
				});
			}
		}
	},

	render() {
		if (this.state.loading) {
			return <LoadingGauge />;
		}

		var showButtons = !this.state.vizualization;

		if(this.state.vizualization){

			return <div>
				{this.state.subitemModel ? this.renderBreadcrumb() : ""}

				<div className="fpdi-card fpdi-card-full floatLeft">

				<h1>
					{this.state.subitemModel.data.name}
					{
						(this.context.roles.ADMIN ||
							_.contains(this.context.permissions, PermissionsTypes.FORRISCO_MANAGE_POLICY_PERMISSION))
						&&
						<span className="dropdown">
							<a
								className="dropdown-toggle"
								data-toggle="dropdown"
								aria-haspopup="true"
								aria-expanded="true"
								title={Messages.get("label.actions")}
								>
								<span className="sr-only">{Messages.getEditable("label.actions","fpdi-nav-label")}</span>
								<span className="mdi mdi-chevron-down" />
							</a>
							{this.context.policy.archived ? this.renderArchivePolicy() : this.renderUnarchivePolicy()}
						</span>
					}
				</h1>

				{this.state.fields && (this.state.fields.length > 0) ?
					this.state.fields.map((fieldsubitem, index) => {
					if(fieldsubitem.type ==  AttributeTypes.TEXT_AREA_FIELD){
						return (
							<div><VerticalForm
							vizualization={this.state.vizualization}
							onCancel={this.onCancel}
							onSubmit={this.onSubmit}
							fields={[fieldsubitem]}
							submitLabel={Messages.get("label.submitLabel")}
						/></div>)
					}else{
						return (
							<div>
							<label className="fpdi-text-label">{fieldsubitem.value}</label>
							<div className="panel panel-default">
								<table className="budget-field-table table">
									<tbody>
										<tr>
											<td className="fdpi-table-cell">
												<a target="_blank" rel="noopener noreferrer" href={fieldsubitem.fileLink}>
													{fieldsubitem.description}</a>
											</td>
										</tr>
									</tbody>
								</table>
								</div>
							</div>
						)
					}

				}) :""}

			</div>
			</div>;
		}else{


			//editar
			return (
				<div>

				<form onSubmit={this.onSubmit} ref="newSubitemForm">

				{this.state.subitemModel ? this.renderBreadcrumb() : ""}

				<div className="fpdi-card fpdi-card-full floatLeft">
					<h1>
						{this.state.title}
					</h1>


					{
						//título
					}

					<AttributeInput
						fieldDef={this.getField()}
						undeletable={false}
						vizualization={this.props.vizualization}
						//ref="formAlertErrorTitulo"
						//ref={this.getField().name}
						//key={this.getField().name}
						//deleteFunc={this.props.deleteFunc}
						//editFunc={this.props.editFunc}
						//alterable={this.props.alterable}
						//isDocument={this.props.isDocument}
						//onClick={this.props.onClick}
						//onChage={this.props.onChage}
					/>


					{
						//campos
					}

					{this.state.fields && (this.state.fields.length > 0) ?
					this.state.fields.map((fieldsubitem, index) => {
						if(fieldsubitem.type ==  AttributeTypes.TEXT_AREA_FIELD){
							//fieldsubitem.name=fieldsubitem.name
							//fieldsubitem.value=fieldsubitem.label
							fieldsubitem.isText=true;
								return (
									<div>
									<FieldItemInput
										vizualization={!this.props.vizualization}
										deleteFunc={this.deleteFunc}
										editFunc={this.editFunc}
										setItem={this.setItem}
										fields={this.state.fields}
										reset={this.reset}
										field={fieldsubitem}
										index={index}
										getLength={this.getLength}
										buttonsErrorMark={this.state.hasPendindField}
									/>
									</div>
								)
						}else if (fieldsubitem.type ==  AttributeTypes.ATTACHMENT_FIELD){
							fieldsubitem.isText=false;
							return (
								<div>
								<FieldItemInput
									vizualization={!this.props.vizualization}
									deleteFunc={this.deleteFunc}
									editFunc={this.editFunc}
									setItem={this.setItem}
									fields={this.state.fields}
									reset={this.reset}
									field={fieldsubitem}
									index={index}
									getLength={this.getLength}
									buttonsErrorMark={this.state.hasPendindField}
								/>
								</div>)
						}
					}):""}


					{
						//Adicioonar novo campo
					}

					{this.state.newField ?
						<FieldItemInput
							vizualization={this.props.vizualization}
							deleteFunc={this.deleteFunc}
							editFunc={this.editFunc}
							setsubitem={this.setsubitem}
							fields={this.state.fields}
							reset={this.reset}
							getLength={this.getLength}
							buttonsErrorMark={this.state.hasPendindField}
						/>
					:
					(((this.context.roles.MANAGER || _.contains(this.context.permissions,
					PermissionsTypes.MANAGE_DOCUMENT_PERMISSION)) && this.props.params.policyId) ? // && !this.state.model.preTextSection) ?
					<button onClick={this.tweakNewField} id="addIconDocument" className="btn btn-sm btn-neutral marginTop20">
						<span className="mdi mdi-plus" /> {Messages.get("label.addNewField")}
					</button>
					:"")}


					<br/><br/><br/>
					{showButtons ?
					(!!this.props.blockButtons ?
						(<div className="form-group">
							<button type="submit" className="btn btn-success btn-block">{this.state.submitLabel}</button>
							{!this.props.hideCanel ? (!this.props.cancelUrl ?
								<button className="btn btn-default  btn-block" onClick={this.cancelWrapper}>{this.state.cancelLabel}</button>
								:(
									<Link to={this.props.cancelUrl} className="btn btn-default btn-block">{this.state.cancelLabel}</Link>
								)):""}
						</div>)
					:
						(<div className="form-group text-left">
							<button type="submit" className="btn btn-sm btn-success">{this.state.submitLabel}</button>
							{!this.props.hideCanel ? (!this.props.cancelUrl ?
								<button className="btn btn-sm btn-default" onClick={this.cancelWrapper}>{this.state.cancelLabel}</button>
								:
								<Link className="btn btn-sm btn-default" to={this.props.cancelUrl}>{this.state.cancelLabel}</Link>
							):""}
						</div>)
					)
				: ""}
				</div>
			</form>
		</div>);
		}
	}

});
