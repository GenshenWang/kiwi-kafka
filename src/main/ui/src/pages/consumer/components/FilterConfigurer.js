import React, { Component } from "react";
import {
    Button, ButtonGroup,
    DropdownItem,
    DropdownMenu,
    DropdownToggle, Input,
    InputGroup,
    InputGroupButtonDropdown, ListGroup, ListGroupItem
} from "reactstrap";
import PropTypes from "prop-types";
import "../../../App.css";

class FilterConfigurer extends Component {

    constructor(props) {
        super(props);
        this.state = {
            id : props.id,
            name : props.name,
            useFilter: false,
            filters: []
        };
    }

    updateParent = () => {
        if(this.state.useFilter && this.state.filters.every(this.validateFilter)){
            this.props.onUpdate(this.state.filters.map(filter => {
                return {
                    filter: filter.filter,
                    filterType: filter.filterType,
                    filterApplication: filter.filterApplication,
                    isCaseSensitive: filter.isCaseSensitive
                }
            }));
        }
        else this.props.onUpdate([]);
    };

    validateFilter = (filter) =>
        filter.filter &&
        filter.filterType &&
        filter.filterApplication;

    toggleFilterTypeButton = (index) => {
        let filters = this.state.filters;
        filters[index].filterTypeButtonOpen = !filters[index].filterTypeButtonOpen;
        this.setState({
            filters: filters
        }, this.updateParent);
    };

    toggleFilterTypeApplicationButton = (index) => {
        let filters = this.state.filters;
        filters[index].filterApplicationButtonOpen = !filters[index].filterApplicationButtonOpen;
        this.setState({
            filterApplicationButtonOpen: !this.state.filterApplicationButtonOpen
        }, this.updateParent);
    };

    setFilter = (filter, index) => {
        let filters = this.state.filters;
        filters[index].filter = filter;
        this.setState({
            filters:filters
        }, this.updateParent);
    };

    setFilterType = (filterType, index) => {
        let filters = this.state.filters;
        filters[index].filterType = filterType;
        this.setState({
            filters: filters
        }, this.updateParent)
    };

    setFilterApplication = (filterApplication, index) => {
        let filters = this.state.filters;
        filters[index].filterApplication = filterApplication;

        this.setState({
            filters: filters
        }, this.updateParent)
    };

    setCaseSensitive = (index) => {
        let filters = this.state.filters;
        filters[index].isCaseSensitive = !filters[index].isCaseSensitive;
        this.setState({
            filters: filters
        }, this.updateParent)
    };

    addFilter = () => {
        this.setState({
            useFilter: true,
            filters: [...this.state.filters, {
                filterTypeButtonOpen: false,
                filterApplicationButtonOpen: false,
                filter: '',
                filterType: 'STARTS_WITH',
                filterApplication: 'KEY',
                isCaseSensitive: false
            }]
        }, this.updateParent);
    };

    removeFilter = () => {
        let useFilter = this.state.filters.length > 1;
        this.setState({
            useFilter: useFilter,
            filters: useFilter ? this.state.filters.slice(0, -1) : []
        }, this.updateParent);
    };

    render() {
        return (
            <div id={this.state.id}>

                <div className="mt-lg-1"/>
                <div className="Gap"/>
                {   this.state.useFilter ?

                    <ListGroup>
                        {
                            this.state.filters.map((filter, index) => {
                                return (
                                        <ListGroupItem key={index} className={"ListGroupNoHorizontalPad"}>
                                            <InputGroup>
                                            <InputGroupButtonDropdown addonType="prepend"
                                                                      isOpen={this.state.filters[index].filterApplicationButtonOpen}
                                                                      toggle={() => this.toggleFilterTypeApplicationButton(index)}>
                                                <DropdownToggle split outline />
                                                <DropdownMenu>
                                                    <DropdownItem header>Filter Applies To</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterApplication("KEY", index)}>Key</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterApplication("VALUE", index)}>Message</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterApplication("HEADER_KEY", index)}>Header Key</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterApplication("HEADER_VALUE", index)}>Header Value</DropdownItem>
                                                </DropdownMenu>
                                                <Button disabled>{this.state.filters[index].filterApplication}</Button>
                                            </InputGroupButtonDropdown>
                                            <InputGroupButtonDropdown addonType="prepend"
                                                                      isOpen={this.state.filters[index].filterTypeButtonOpen}
                                                                      toggle={() => this.toggleFilterTypeButton(index)}>
                                                <DropdownToggle split outline />
                                                <DropdownMenu>
                                                    <DropdownItem header>Filter Type</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterType("MATCHES", index)}>Matches</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterType("STARTS_WITH", index)}>Starts With</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterType("ENDS_WITH", index)}>Ends With</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterType("CONTAINS", index)}>Contains</DropdownItem>
                                                    <DropdownItem onClick={() => this.setFilterType("REGEX", index)}>Regex</DropdownItem>
                                                </DropdownMenu>
                                                <Button disabled>{this.state.filters[index].filterType}</Button>
                                            </InputGroupButtonDropdown>
                                            <Input
                                                type="text"
                                                name="filter"
                                                id="filter"
                                                value={this.state.filters[index].filter}
                                                onChange={event => this.setFilter(event.target.value, index)}
                                            />
                                            {
                                                this.state.filters[index].filterType !== 'REGEX' ?
                                                    <Button onClick={() => this.setCaseSensitive(index)}>
                                                        {this.state.filters[index].isCaseSensitive ? 'Case Sensitive' : 'Case Insensitive' }
                                                    </Button>
                                                    : null
                                            }
                                        </InputGroup>
                                            {
                                                index === this.state.filters.length-1 ?
                                                    <div className={"Gap"}>
                                                        <ButtonGroup>
                                                            <Button onClick={() => this.addFilter()}>
                                                                + Add
                                                            </Button>
                                                            <Button onClick={() => this.removeFilter()}>
                                                                - Remove
                                                            </Button>
                                                        </ButtonGroup>
                                                    </div>
                                                    : null
                                            }

                                    </ListGroupItem>
                                )
                            })
                        }

                    </ListGroup>
                    :
                    <Button size="sm" block onClick={this.addFilter} width={'100%'}>Include Message Filter</Button>
                }

                <div className="mt-lg-1"/>
            </div>
        )
    }
}

FilterConfigurer.propTypes = {
    name: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    onUpdate: PropTypes.func.isRequired
};

export default FilterConfigurer;