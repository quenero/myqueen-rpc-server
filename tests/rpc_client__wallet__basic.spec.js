// Copyright (c) 2014-2020, MyMonero.com
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//	conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//	of conditions and the following disclaimer in the documentation and/or other
//	materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be
//	used to endorse or promote products derived from this software without specific
//	prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
// THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
// THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
"use strict";
const assert = require('assert')
const axios = require('axios')
//
// RPC server client:
const rpc_server_url = 'http://localhost:19082/json'
function _send_RPC_message(rpc_req_id, method, params, fn)
{
	var payload = 
	{
		jsonrpc: "2.0", id: rpc_req_id,
		method: method, params: params
	}
	// TODO: use (node-)fetch for this ?
	axios.post(rpc_server_url, payload).then(function(res) {
		console.log("Got res data" , res.data)
		fn(null, res.data)
	}).catch(function(e) {
		console.log("Error response from POST: ")
		fn(new Error(""+e))
	})
}
//
// test constants
const filename0 = "mytestwallet"
const password0 = "mytestpassword"
const wallet_language = "English"
//
const created_wallet_filename0 = filename0+"-"+(new Date()).getTime()
//
describe("RPC client tests - Wallet RPC - basic wallet functions", function()
{
	//
	// I. creating, closing, opening
	it("can create_wallet", function(done)
	{
		this.timeout(20 * 1000);
		//
		let rpc_req_id = "t1"
		let method = "create_wallet"
		let params = {
			filename: created_wallet_filename0,
			password: password0,
			language: wallet_language
		}
		_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
			if (err) {
				return done(err)
			}
			assert.equal(res_data.id, rpc_req_id)
			done()
		})
	});
	it("can close created wallet", function(done)
	{
		this.timeout(20 * 1000);
		//
		setTimeout(function() {
			let rpc_req_id = "t2"
			let method = "close_wallet"
			let params = {}
			_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
				if (err) {
					return done(err)
				}
				assert.equal(res_data.id, rpc_req_id)
				done()
			})
		}, 1000) // give the server a sec to stabilize
	})
	it("can open created, closed wallet", function(done)
	{
		this.timeout(20 * 1000);
		//
		let rpc_req_id = "t3"
		let method = "open_wallet"
		let params = {
			filename: created_wallet_filename0,
			password: password0
		}
		_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
			if (err) {
				return done(err)
			}
			assert.equal(res_data.id, rpc_req_id)
			done()
		})
	})
	it("can close opened created wallet", function(done)
	{
		this.timeout(20 * 1000);
		//
		setTimeout(function() {
				let rpc_req_id = "t4"
			let method = "close_wallet"
			let params = {}
			_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
				if (err) {
					return done(err)
				}
				assert.equal(res_data.id, rpc_req_id)
				done()
			})
		}, 1000) // give the server a sec to stabilize
	})
	//
	// II. restoring
	var deterministic_wallet_filename = "restored_wallet"+"-"+(new Date()).getTime() // so we don't get filename conflicts
	it("can restore_deterministic_wallet", function(done)
	{
		this.timeout(20 * 1000);
		//
		const addr1 = "43zxvpcj5Xv9SEkNXbMCG7LPQStHMpFCQCmkmR4u5nzjWwq5Xkv5VmGgYEsHXg4ja2FGRD5wMWbBVMijDTqmmVqm93wHGkg"
		const vk1 = "7bea1907940afdd480eff7c4bcadb478a0fbb626df9e3ed74ae801e18f53e104"
		const sk1 = "4e6d43cd03812b803c6f3206689f5fcc910005fc7e91d50d79b0776dbefcd803"
		const seedwords1 = "foxes selfish humid nexus juvenile dodge pepper ember biscuit elapse jazz vibrate biscuit"
		// const wallet_language = "English"
		//
		let rpc_req_id = "t5"
		let method = "restore_deterministic_wallet"
		let params = {
			filename: deterministic_wallet_filename, 
			password: password0,
			seed: seedwords1,
			restore_height: 0,
			seed_offset: "",
			autosave_current: true
		}
		_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
			if (err) {
				return done(err)
			}
			assert.equal(res_data.id, rpc_req_id)
			const result = res_data.result
			assert.equal(addr1, result.address)
			assert.equal("Wallet has been restored successfully.", result.info)
			assert.equal(seedwords1, result.seed)
			// assert.equal(result.was_deprecated, false) // TODO
			done()
		})
	})
	it("can close restored wallet", function(done)
	{
		this.timeout(20 * 1000);
		//
		setTimeout(function() {
			let rpc_req_id = "t6"
			let method = "close_wallet"
			let params = {}
			_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
				if (err) {
					return done(err)
				}
				assert.equal(res_data.id, rpc_req_id)
				done()
			})
		}, 4000); // give the WS server / client some time to sync up before closing the WS connection down
	})
	it("can reopen restored wallet for txs", function(done)
	{
		this.timeout(20 * 1000);
		//
		let rpc_req_id = "t7"
		let method = "open_wallet"
		let params = {
			filename: deterministic_wallet_filename,
			password: password0
		}
		_send_RPC_message(rpc_req_id, method, params, function(err, res_data) {
			if (err) {
				return done(err)
			}
			assert.equal(res_data.id, rpc_req_id)
			done()
		})
	})
});


