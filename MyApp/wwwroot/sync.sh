pushd /home/mythz/src/ServiceStack/llms/llms-home/extensions/viewer
./sync.sh
popd
rm -rf llms
cp -rf /home/mythz/src/ServiceStack/llms/llms-home/extensions/viewer/ui llms